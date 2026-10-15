import os
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager

import jwt
from pwdlib import PasswordHash
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("AURAFLIX_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "AURAFLIX_SECRET_KEY is missing. Configure it in backend/.env"
    )

ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60

DATABASE = BASE_DIR / "auraflix.db"
password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer()


def get_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="AURAFLIX ULTRA API",
    description="Authentication API for AURAFLIX ULTRA",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://auraflix-ultra.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr


def create_access_token(user_id: int):
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=TOKEN_EXPIRE_MINUTES
    )

    return jwt.encode(
        {"sub": str(user_id), "exp": expires},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired login session.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    with get_connection() as connection:
        user = connection.execute(
            "SELECT id, name, email FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found.",
        )

    return dict(user)


@app.get("/")
def home():
    return {
        "app": "AURAFLIX ULTRA",
        "status": "online",
        "message": "Feel the Story. Live the Aura.",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/auth/register", response_model=UserResponse,
          status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest):
    name = data.name.strip()
    email = str(data.email).strip().lower()

    if not name:
        raise HTTPException(400, "Name cannot be empty.")

    password_hash = password_hasher.hash(data.password)

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (name, email, password_hash, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    name,
                    email,
                    password_hash,
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            user_id = cursor.lastrowid

    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    return {
        "id": user_id,
        "name": name,
        "email": email,
    }


@app.post("/auth/login")
def login(data: LoginRequest):
    email = str(data.email).strip().lower()

    with get_connection() as connection:
        user = connection.execute(
            """
            SELECT id, name, email, password_hash
            FROM users
            WHERE email = ?
            """,
            (email,),
        ).fetchone()

    if user is None or not password_hasher.verify(
        data.password, user["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password.",
        )

    return {
        "access_token": create_access_token(user["id"]),
        "token_type": "bearer",
        "expires_in": TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
        },
    }


@app.get("/auth/me", response_model=UserResponse)
def me(user=Depends(get_current_user)):
    return user
