"""后端账号与云端项目存储。
   - 本地（桌面内置 sidecar）：用 SQLite 文件
   - 部署到云端（设了环境变量 DATABASE_URL）：自动切 Postgres（如 Neon）
   - 密码 PBKDF2-SHA256 加盐哈希；登录返回 HMAC 签名 token（含过期时间）
   仅用标准库 + 可选 psycopg（云端才需要），本地无第三方依赖。
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import importlib
import json
import os
import secrets
import time

DATABASE_URL = os.environ.get("DATABASE_URL")
USE_PG = bool(DATABASE_URL)
PH = "%s" if USE_PG else "?"  # 占位符：Postgres 用 %s，SQLite 用 ?

DB_PATH = os.path.join(os.path.dirname(__file__), "medviz_users.db")
SECRET = os.environ.get("MEDVIZ_SECRET", "medviz-dev-secret-change-me").encode()
TOKEN_TTL = 7 * 86400  # 7 天
ITER = 150_000


def _connect():
    if USE_PG:
        psycopg = importlib.import_module("psycopg")  # 延迟导入，避免打进桌面 sidecar
        return psycopg.connect(DATABASE_URL)
    import sqlite3

    return sqlite3.connect(DB_PATH)


def _run(sql: str, params: tuple = (), fetch: str | None = None):
    """执行一条语句；SQL 里统一用 ? 占位，按后端替换为 %s。"""
    sql = sql.replace("?", PH)
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        out = cur.fetchone() if fetch == "one" else cur.fetchall() if fetch == "all" else None
        conn.commit()
        return out
    finally:
        conn.close()


def init_db() -> None:
    _run("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, email TEXT, salt TEXT, hash TEXT, created TEXT)")
    _run("CREATE TABLE IF NOT EXISTS projects (username TEXT PRIMARY KEY, data TEXT, updated TEXT)")


def _hash(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITER).hex()


# ---------------- 用户 ----------------
def create_user(username: str, email: str, password: str) -> None:
    username = username.strip()
    if _run("SELECT 1 FROM users WHERE username=?", (username,), fetch="one"):
        raise ValueError("该用户名已被注册")
    salt = secrets.token_bytes(16)
    _run(
        "INSERT INTO users (username,email,salt,hash,created) VALUES (?,?,?,?,?)",
        (username, email.strip(), salt.hex(), _hash(password, salt), time.strftime("%Y-%m-%dT%H:%M:%S")),
    )


def verify_user(username: str, password: str) -> dict:
    row = _run("SELECT username,email,salt,hash FROM users WHERE username=?", (username.strip(),), fetch="one")
    if not row:
        raise ValueError("用户名不存在")
    if not hmac.compare_digest(_hash(password, bytes.fromhex(row[2])), row[3]):
        raise ValueError("密码错误")
    return {"username": row[0], "email": row[1]}


def get_user(username: str) -> dict | None:
    row = _run("SELECT username,email FROM users WHERE username=?", (username,), fetch="one")
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
    if not hmac.compare_digest(sig, hmac.new(SECRET, msg.encode(), hashlib.sha256).hexdigest()):
        return None
    if int(exp) < int(time.time()):
        return None
    pad = "=" * (-len(payload) % 4)
    return base64.urlsafe_b64decode(payload + pad).decode()


# ---------------- 云端项目 ----------------
def get_projects(username: str) -> list:
    row = _run("SELECT data FROM projects WHERE username=?", (username,), fetch="one")
    return json.loads(row[0]) if row else []


def set_projects(username: str, projects: list) -> str:
    updated = time.strftime("%Y-%m-%dT%H:%M:%S")
    _run(
        "INSERT INTO projects (username,data,updated) VALUES (?,?,?) "
        "ON CONFLICT(username) DO UPDATE SET data=excluded.data, updated=excluded.updated",
        (username, json.dumps(projects, ensure_ascii=False), updated),
    )
    return updated
