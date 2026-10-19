import os
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta, timezone
from contextlib import contextmanager, asynccontextmanager

import jwt
import psycopg
from psycopg.rows import dict_row
from pwdlib import PasswordHash
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("AURAFLIX_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("AURAFLIX_SECRET_KEY is missing.")

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
USE_POSTGRES = DATABASE_URL.startswith(("postgres://", "postgresql://"))

# Never silently run production on ephemeral SQLite.
if os.getenv("RENDER") and not USE_POSTGRES:
    raise RuntimeError("Production requires DATABASE_URL pointing to PostgreSQL.")

ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60
SQLITE_DATABASE = BASE_DIR / "auraflix.db"
password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer()


@contextmanager
def get_connection():
    if USE_POSTGRES:
        connection = psycopg.connect(
            DATABASE_URL,
            row_factory=dict_row,
            connect_timeout=15,
        )
    else:
        connection = sqlite3.connect(SQLITE_DATABASE)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def execute(connection, sql, params=()):
    if USE_POSTGRES:
        sql = sql.replace("?", "%s")
    return connection.execute(sql, params)


def initialize_database():
    if USE_POSTGRES:
        user_schema = """
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """
    else:
        user_schema = """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """

    with get_connection() as connection:
        connection.execute(user_schema)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS watchlist (
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                movie_id BIGINT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (user_id, movie_id)
            )
        """)


def migrate_local_sqlite_to_postgres():
    """
    Best-effort, repeatable migration if an old local SQLite file exists
    beside this backend. Password hashes are preserved; passwords are not
    decrypted. Existing PostgreSQL records are not overwritten.
    """
    if not USE_POSTGRES or not SQLITE_DATABASE.exists():
        return

    try:
        source = sqlite3.connect(SQLITE_DATABASE)
        source.row_factory = sqlite3.Row
        try:
            user_rows = source.execute(
                "SELECT id, name, email, password_hash, created_at FROM users"
            ).fetchall()

            watchlist_rows = source.execute(
                "SELECT user_id, movie_id, created_at FROM watchlist"
            ).fetchall()
        finally:
            source.close()
    except sqlite3.Error:
        # A missing/older database schema must not block the new service.
        return

    with get_connection() as target:
        for row in user_rows:
            execute(
                target,
                """INSERT INTO users (id, name, email, password_hash, created_at)
                   VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING""",
                (row["id"], row["name"], row["email"],
                 row["password_hash"], row["created_at"]),
            )

        for row in watchlist_rows:
            execute(
                target,
                """INSERT INTO watchlist (user_id, movie_id, created_at)
                   VALUES (?, ?, ?) ON CONFLICT DO NOTHING""",
                (row["user_id"], row["movie_id"], row["created_at"]),
            )

        if USE_POSTGRES and user_rows:
            target.execute("""
                SELECT setval(
                    pg_get_serial_sequence('users', 'id'),
                    GREATEST(COALESCE((SELECT MAX(id) FROM users), 1), 1),
                    EXISTS(SELECT 1 FROM users)
                )
            """)


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    migrate_local_sqlite_to_postgres()
    yield


app = FastAPI(
    title="AURAFLIX ULTRA API",
    description="Authentication and watchlist API for AURAFLIX ULTRA",
    version="1.1.0",
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
    allow_methods=["GET", "POST", "OPTIONS"],
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


class WatchlistRequest(BaseModel):
    movie_ids: list[int] = Field(max_length=500)


class WatchlistResponse(BaseModel):
    movie_ids: list[int]


def create_access_token(user_id: int):
    expires = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expires},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired login session.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    with get_connection() as connection:
        user = execute(
            connection,
            "SELECT id, name, email FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if user is None:
        raise HTTPException(status_code=401, detail="Account not found.")

    return dict(user)


@app.get("/")
def home():
    return {
        "message": "Feel the Story. Live the Aura.",
        "service": "AURAFLIX ULTRA API",
        "database": "postgresql" if USE_POSTGRES else "sqlite-local",
    }


@app.get("/health")
def health():
    return {"status": "healthy", "database": "postgresql" if USE_POSTGRES else "sqlite-local"}


@app.get("/health/database")
def database_health():
    try:
        with get_connection() as connection:
            if USE_POSTGRES:
                connection.execute("SELECT 1").fetchone()
            else:
                connection.execute("SELECT 1").fetchone()
        return {"status": "connected", "database": "postgresql" if USE_POSTGRES else "sqlite-local"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database connection failed.")


@app.post("/auth/register", response_model=UserResponse, status_code=201)
def register(data: RegisterRequest):
    name = data.name.strip()
    email = str(data.email).strip().lower()

    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")

    password_hash = password_hasher.hash(data.password)
    created_at = datetime.now(timezone.utc).isoformat()

    try:
        with get_connection() as connection:
            if USE_POSTGRES:
                row = execute(
                    connection,
                    """INSERT INTO users (name, email, password_hash, created_at)
                       VALUES (?, ?, ?, ?) RETURNING id""",
                    (name, email, password_hash, created_at),
                ).fetchone()
                user_id = row["id"]
            else:
                cursor = execute(
                    connection,
                    """INSERT INTO users (name, email, password_hash, created_at)
                       VALUES (?, ?, ?, ?)""",
                    (name, email, password_hash, created_at),
                )
                user_id = cursor.lastrowid
    except (sqlite3.IntegrityError, psycopg.errors.UniqueViolation):
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists.",
        )

    return {"id": user_id, "name": name, "email": email}


@app.post("/auth/login")
def login(data: LoginRequest):
    email = str(data.email).strip().lower()

    with get_connection() as connection:
        user = execute(
            connection,
            """SELECT id, name, email, password_hash
               FROM users WHERE email = ?""",
            (email,),
        ).fetchone()

    if user is None or not password_hasher.verify(
        data.password, user["password_hash"]
    ):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

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
def get_me(user=Depends(get_current_user)):
    return user


@app.get("/watchlist", response_model=WatchlistResponse)
def get_watchlist(user=Depends(get_current_user)):
    with get_connection() as connection:
        rows = execute(
            connection,
            "SELECT movie_id FROM watchlist WHERE user_id = ? ORDER BY movie_id",
            (user["id"],),
        ).fetchall()

    return {"movie_ids": [int(row["movie_id"]) for row in rows]}


@app.post("/watchlist", response_model=WatchlistResponse)
def save_watchlist(data: WatchlistRequest, user=Depends(get_current_user)):
    movie_ids = list(dict.fromkeys(data.movie_ids))

    if any(movie_id < 1 for movie_id in movie_ids):
        raise HTTPException(status_code=400, detail="Movie IDs must be positive.")

    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        execute(connection, "DELETE FROM watchlist WHERE user_id = ?", (user["id"],))

        for movie_id in movie_ids:
            execute(
                connection,
                """INSERT INTO watchlist (user_id, movie_id, created_at)
                   VALUES (?, ?, ?)""",
                (user["id"], movie_id, now),
            )

    return {"movie_ids": movie_ids}
