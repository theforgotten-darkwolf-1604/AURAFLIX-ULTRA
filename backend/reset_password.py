import sqlite3
from getpass import getpass
from pathlib import Path
from pwdlib import PasswordHash

db = Path(__file__).resolve().parent / "auraflix.db"

email = input("Enter your registered email: ").strip().lower()

with sqlite3.connect(db) as connection:
    row = connection.execute(
        "SELECT id, name, email FROM users WHERE lower(email) = ?",
        (email,)
    ).fetchone()

    if row is None:
        print("ERROR: Account not found.")
        raise SystemExit(1)

    print(f"Account found: {row[1]} ({row[2]})")

    password1 = getpass("Enter a NEW password: ")
    password2 = getpass("Confirm your new password: ")

    if len(password1) < 8:
        print("ERROR: Password must contain at least 8 characters.")
        raise SystemExit(1)

    if password1 != password2:
        print("ERROR: Passwords do not match.")
        raise SystemExit(1)

    password_hash = PasswordHash.recommended().hash(password1)

    connection.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (password_hash, row[0])
    )

print("SUCCESS: Password updated. Your account is preserved.")
