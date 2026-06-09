"""后端账号与云端项目存储（标准库实现，无第三方依赖）。
   - SQLite 存用户和每用户的项目集合
   - 密码 PBKDF2-SHA256 加盐哈希
   - 登录返回 HMAC 签名的 token（含过期时间）
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "medviz_users.db")
# 生产应通过环境变量注入；缺省时本机生成一次性密钥
SECRET = os.environ.get("MEDVIZ_SECRET", "medviz-dev-secret-change-me").encode()
TOKEN_TTL = 7 * 86400  # 7 天
ITER = 150_000


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(DB_PATH)
    c.execute("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, email TEXT, salt TEXT, hash TEXT, created TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS projects (username TEXT PRIMARY KEY, data TEXT, updated TEXT)")
    return c


def _hash(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITER).hex()


# ---------------- 用户 ----------------
def create_user(username: str, email: str, password: str) -> None:
    username = username.strip()
    with _conn() as c:
        if c.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
            raise ValueError("该用户名已被注册")
        salt = secrets.token_bytes(16)
        c.execute(
            "INSERT INTO users VALUES (?,?,?,?,?)",
            (username, email.strip(), salt.hex(), _hash(password, salt), time.strftime("%Y-%m-%dT%H:%M:%S")),
        )


def verify_user(username: str, password: str) -> dict:
    with _conn() as c:
        row = c.execute("SELECT username,email,salt,hash FROM users WHERE username=?", (username.strip(),)).fetchone()
    if not row:
        raise ValueError("用户名不存在")
    if not hmac.compare_digest(_hash(password, bytes.fromhex(row[2])), row[3]):
        raise ValueError("密码错误")
    return {"username": row[0], "email": row[1]}


def get_user(username: str) -> dict | None:
    with _conn() as c:
        row = c.execute("SELECT username,email FROM users WHERE username=?", (username,)).fetchone()
    return {"username": row[0], "email": row[1]} if row else None


# ---------------- token ----------------
def make_token(username: str) -> str:
    exp = int(time.time()) + TOKEN_TTL
    payload = base64.urlsafe_b64encode(username.encode()).decode().rstrip("=")
    msg = f"{payload}.{exp}"
    sig = hmac.new(SECRET, msg.encode(), hashlib.sha256).hexdigest()
    return f"{msg}.{sig}"


def verify_token(token: str) -> str | None:
    try:
        payload, exp, sig = token.split(".")
    except ValueError:
        return None
    msg = f"{payload}.{exp}"
    expected = hmac.new(SECRET, msg.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    if int(exp) < int(time.time()):
        return None
    pad = "=" * (-len(payload) % 4)
    return base64.urlsafe_b64decode(payload + pad).decode()


# ---------------- 云端项目 ----------------
def get_projects(username: str) -> list:
    with _conn() as c:
        row = c.execute("SELECT data FROM projects WHERE username=?", (username,)).fetchone()
    return json.loads(row[0]) if row else []


def set_projects(username: str, projects: list) -> str:
    updated = time.strftime("%Y-%m-%dT%H:%M:%S")
    with _conn() as c:
        c.execute(
            "INSERT INTO projects (username,data,updated) VALUES (?,?,?) "
            "ON CONFLICT(username) DO UPDATE SET data=excluded.data, updated=excluded.updated",
            (username, json.dumps(projects, ensure_ascii=False), updated),
        )
    return updated
