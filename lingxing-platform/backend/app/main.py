from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from urllib.parse import urlparse

import httpx
from argon2 import PasswordHasher
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./lingxing.db")
SECRET_KEY = os.environ.get("SECRET_KEY", "")
MASTER_KEY_TEXT = os.environ.get("CREDENTIAL_MASTER_KEY", "")
ALLOWED_HOSTS = {x.strip().lower() for x in os.environ.get("LINGXING_ALLOWED_HOSTS", "openapi.lingxing.com").split(",") if x.strip()}
if len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY must contain at least 32 characters")
try:
    MASTER_KEY = base64.urlsafe_b64decode(MASTER_KEY_TEXT + "=" * (-len(MASTER_KEY_TEXT) % 4))
except Exception as exc:
    raise RuntimeError("CREDENTIAL_MASTER_KEY must be URL-safe base64") from exc
if len(MASTER_KEY) != 32:
    raise RuntimeError("CREDENTIAL_MASTER_KEY must decode to exactly 32 bytes")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)
ph = PasswordHasher()

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20), default="admin")
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class LingxingConnection(Base):
    __tablename__ = "lingxing_connections"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    host: Mapped[str] = mapped_column(String(255), default="https://openapi.lingxing.com")
    app_id: Mapped[str] = mapped_column(String(255))
    secret_enc: Mapped[str] = mapped_column(Text)
    token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="unverified")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class FeishuConnection(Base):
    __tablename__ = "feishu_connections"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    app_id: Mapped[str] = mapped_column(String(255))
    secret_enc: Mapped[str] = mapped_column(Text)
    app_token: Mapped[str] = mapped_column(String(255))
    table_id: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), default="unverified")

class Endpoint(Base):
    __tablename__ = "api_endpoints"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    module: Mapped[str] = mapped_column(String(80), index=True)
    method: Mapped[str] = mapped_column(String(10))
    path: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text, default="")
    parameter_location: Mapped[str] = mapped_column(String(20), default="body")
    parameters: Mapped[list] = mapped_column(JSON, default=list)
    response_path: Mapped[str] = mapped_column(String(500), default="data")
    primary_keys: Mapped[list] = mapped_column(JSON, default=list)
    pagination: Mapped[dict] = mapped_column(JSON, default=dict)
    operation_kind: Mapped[str] = mapped_column(String(20), default="query")
    status: Mapped[str] = mapped_column(String(30), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    sample_response: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))

class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    template: Mapped[str] = mapped_column(String(80))
    endpoint_id: Mapped[int | None] = mapped_column(ForeignKey("api_endpoints.id"), nullable=True)
    schedule: Mapped[str] = mapped_column(String(20), default="08:00")
    status: Mapped[str] = mapped_column(String(30), default="waiting_configuration")
    config: Mapped[dict] = mapped_column(JSON, default=dict)

class ApiLog(Base):
    __tablename__ = "api_call_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    endpoint_id: Mapped[int | None] = mapped_column(nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(30))
    duration_ms: Mapped[int] = mapped_column(Integer)
    request_summary: Mapped[dict] = mapped_column(JSON, default=dict)
    response_summary: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class LingxingIn(BaseModel):
    name: str = "默认领星连接"
    host: str = "https://openapi.lingxing.com"
    app_id: str
    app_secret: str = Field(min_length=1)
    @field_validator("host")
    @classmethod
    def validate_host(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS or parsed.path not in ("", "/"):
            raise ValueError("仅允许配置预设的领星官方HTTPS域名")
        return value.rstrip("/")

class FeishuIn(BaseModel):
    name: str = "默认飞书连接"
    app_id: str
    app_secret: str
    app_token: str
    table_id: str

class ParameterDef(BaseModel):
    name: str
    label: str = ""
    type: Literal["string", "integer", "number", "boolean", "date", "datetime", "enum", "array", "object"] = "string"
    required: bool = False
    default: Any = None
    options: list[Any] = []

class EndpointIn(BaseModel):
    name: str
    module: str
    method: Literal["GET", "POST"]
    path: str
    description: str = ""
    parameter_location: Literal["query", "body", "form"] = "body"
    parameters: list[ParameterDef] = []
    response_path: str = "data"
    primary_keys: list[str] = []
    pagination: dict = {}
    operation_kind: Literal["query", "write"] = "query"
    @field_validator("path")
    @classmethod
    def validate_path(cls, value: str) -> str:
        if not value.startswith("/") or value.startswith("//") or "://" in value or ".." in value:
            raise ValueError("接口路径必须是安全的相对路径")
        return value

class ExecuteIn(BaseModel):
    connection_id: int
    parameters: dict[str, Any] = {}
    confirmation: str | None = None
    save_sample: bool = False

class JobIn(BaseModel):
    name: str
    template: str
    endpoint_id: int | None = None
    schedule: str = "08:00"
    config: dict = {}

app = FastAPI(title="领星 API ETL 与全接口控制台", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost").split(","), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def encrypt_text(value: str) -> str:
    nonce = secrets.token_bytes(12)
    encrypted = AESGCM(MASTER_KEY).encrypt(nonce, value.encode(), None)
    return base64.urlsafe_b64encode(nonce + encrypted).decode()

def decrypt_text(value: str) -> str:
    raw = base64.urlsafe_b64decode(value)
    return AESGCM(MASTER_KEY).decrypt(raw[:12], raw[12:], None).decode()

def token_for(user: User) -> str:
    payload = {"sub": str(user.id), "role": user.role, "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def current_user(session: str | None = Cookie(default=None), db: Session = Depends(get_db)) -> User:
    if not session:
        raise HTTPException(401, "请先登录")
    try:
        user_id = int(jwt.decode(session, SECRET_KEY, algorithms=["HS256"])["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "登录状态无效")
    user = db.get(User, user_id)
    if not user or not user.active:
        raise HTTPException(401, "用户不可用")
    return user

def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "仅管理员可执行")
    return user

def mask(value: str) -> str:
    return value[:4] + "****" + value[-2:] if len(value) > 8 else "****"

def redact(value: Any) -> Any:
    sensitive = {"token", "access_token", "refresh_token", "secret", "app_secret", "password", "email", "phone", "address"}
    if isinstance(value, dict):
        return {k: ("***REDACTED***" if k.lower() in sensitive or any(x in k.lower() for x in ("secret", "token", "password")) else redact(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [redact(x) for x in value[:100]]
    return value

def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)

def lingxing_sign(app_id: str, params: dict[str, Any]) -> str:
    parts = []
    for key in sorted(params):
        value = params[key]
        if value == "":
            continue
        if isinstance(value, (dict, list)):
            value = canonical_json(value)
        elif isinstance(value, bool):
            value = str(value).lower()
        parts.append(f"{key}={value}")
    digest = hashlib.md5("&".join(parts).encode(), usedforsecurity=False).hexdigest().upper().encode()
    key = app_id.encode()[:32]
    key = key.ljust(16 if len(key) < 16 else 32, b"\0") if len(key) not in (16, 24, 32) else key
    pad = 16 - len(digest) % 16
    encrypted = Cipher(algorithms.AES(key), modes.ECB()).encryptor().update(digest + bytes([pad]) * pad)
    return base64.b64encode(encrypted).decode()

async def get_access_token(conn: LingxingConnection, db: Session, force: bool = False) -> str:
    now = datetime.now(timezone.utc)
    expiry = conn.token_expires_at
    if expiry and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if not force and conn.token_enc and expiry and expiry > now + timedelta(minutes=5):
        return decrypt_text(conn.token_enc)
    secret = decrypt_text(conn.secret_enc)
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(conn.host + "/api/auth-server/oauth/access-token", data={"appId": conn.app_id, "appSecret": secret})
    payload = response.json()
    if response.status_code != 200 or str(payload.get("code")) != "200":
        raise HTTPException(400, "领星连接验证失败：" + str(payload.get("msg") or payload.get("message") or response.status_code))
    data = payload.get("data") or {}
    token = data.get("access_token")
    if not token:
        raise HTTPException(400, "领星未返回access_token")
    conn.token_enc = encrypt_text(token)
    conn.token_expires_at = now + timedelta(seconds=int(data.get("expires_in", 7200)))
    conn.status = "connected"
    db.commit()
    return token

@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
        if not db.scalar(select(User).where(User.email == email)):
            password = os.environ.get("ADMIN_PASSWORD", "")
            if len(password) < 10:
                raise RuntimeError("ADMIN_PASSWORD must contain at least 10 characters")
            db.add(User(email=email, password_hash=ph.hash(password), role="admin"))
            db.commit()
        templates = [("店铺列表", "stores"), ("订单列表", "orders"), ("订单利润", "order_profit"), ("FBM自发货", "fbm"), ("FBA库存", "fba_inventory"), ("商品表现", "product_performance")]
        for label, key in templates:
            if not db.scalar(select(Job).where(Job.template == key)):
                db.add(Job(name=label, template=key, status="waiting_configuration"))
        db.commit()

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

@app.post("/api/auth/login")
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user:
        raise HTTPException(401, "账号或密码错误")
    try:
        ph.verify(user.password_hash, payload.password)
    except Exception:
        raise HTTPException(401, "账号或密码错误")
    response.set_cookie("session", token_for(user), httponly=True, secure=os.environ.get("COOKIE_SECURE", "false").lower() == "true", samesite="lax", max_age=43200)
    return {"email": user.email, "role": user.role}

@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("session")
    return {"ok": True}

@app.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return {"email": user.email, "role": user.role}

@app.get("/api/connections/lingxing")
def list_lingxing(_: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(LingxingConnection).order_by(LingxingConnection.id)).all()
    return [{"id": x.id, "name": x.name, "host": x.host, "app_id_masked": mask(x.app_id), "secret_configured": True, "status": x.status, "updated_at": x.updated_at} for x in rows]

@app.post("/api/connections/lingxing")
def create_lingxing(payload: LingxingIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = LingxingConnection(name=payload.name, host=payload.host, app_id=payload.app_id, secret_enc=encrypt_text(payload.app_secret))
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "status": row.status}

@app.post("/api/connections/lingxing/{connection_id}/test")
async def test_lingxing(connection_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    conn = db.get(LingxingConnection, connection_id)
    if not conn: raise HTTPException(404, "连接不存在")
    await get_access_token(conn, db, force=True)
    return {"ok": True, "status": conn.status, "message": "领星连接成功"}

@app.get("/api/connections/feishu")
def list_feishu(_: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(FeishuConnection).order_by(FeishuConnection.id)).all()
    return [{"id": x.id, "name": x.name, "app_id_masked": mask(x.app_id), "app_token_masked": mask(x.app_token), "table_id": x.table_id, "status": x.status} for x in rows]

@app.post("/api/connections/feishu")
def create_feishu(payload: FeishuIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = FeishuConnection(name=payload.name, app_id=payload.app_id, secret_enc=encrypt_text(payload.app_secret), app_token=payload.app_token, table_id=payload.table_id)
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "status": row.status}

@app.post("/api/connections/feishu/{connection_id}/test")
async def test_feishu(connection_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    conn = db.get(FeishuConnection, connection_id)
    if not conn: raise HTTPException(404, "连接不存在")
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", json={"app_id": conn.app_id, "app_secret": decrypt_text(conn.secret_enc)})
    data = response.json()
    if response.status_code != 200 or data.get("code") != 0:
        raise HTTPException(400, "飞书连接验证失败")
    conn.status = "connected"; db.commit()
    return {"ok": True, "message": "飞书连接成功"}

@app.get("/api/endpoints")
def list_endpoints(module: str | None = None, status: str | None = None, _: User = Depends(current_user), db: Session = Depends(get_db)):
    query = select(Endpoint).order_by(Endpoint.module, Endpoint.name)
    if module: query = query.where(Endpoint.module == module)
    if status: query = query.where(Endpoint.status == status)
    return db.scalars(query).all()

@app.post("/api/endpoints/custom")
def create_endpoint(payload: EndpointIn, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = Endpoint(**payload.model_dump(), created_by=user.id)
    db.add(row); db.commit(); db.refresh(row)
    return row

async def execute_endpoint(row: Endpoint, conn: LingxingConnection, values: dict[str, Any], db: Session):
    token = await get_access_token(conn, db)
    sign_params = dict(values)
    auth = {"app_key": conn.app_id, "access_token": token, "timestamp": str(int(time.time()))}
    sign_params.update(auth)
    auth["sign"] = lingxing_sign(conn.app_id, sign_params)
    url = conn.host + row.path
    async with httpx.AsyncClient(timeout=30) as client:
        if row.method == "GET" or row.parameter_location == "query":
            response = await client.request(row.method, url, params={**values, **auth})
        elif row.parameter_location == "form":
            response = await client.request(row.method, url, params=auth, data=values)
        else:
            response = await client.request(row.method, url, params=auth, json=values)
    try: payload = response.json()
    except Exception: payload = {"http_status": response.status_code, "text": response.text[:2000]}
    if response.status_code != 200:
        raise HTTPException(502, f"领星接口HTTP错误：{response.status_code}")
    return payload

@app.post("/api/endpoints/custom/{endpoint_id}/test")
async def test_endpoint(endpoint_id: int, payload: ExecuteIn, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.get(Endpoint, endpoint_id); conn = db.get(LingxingConnection, payload.connection_id)
    if not row or not conn: raise HTTPException(404, "接口或连接不存在")
    if row.operation_kind == "write" and payload.confirmation != row.name:
        raise HTTPException(400, "写接口需要输入完整接口名称确认")
    started = time.perf_counter()
    try:
        result = await execute_endpoint(row, conn, payload.parameters, db)
        row.status = "tested"
        if payload.save_sample: row.sample_response = redact(result)
        db.add(ApiLog(endpoint_id=row.id, user_id=user.id, status="success", duration_ms=int((time.perf_counter()-started)*1000), request_summary=redact(payload.parameters), response_summary=redact(result)))
        db.commit()
        return {"ok": True, "duration_ms": int((time.perf_counter()-started)*1000), "data": redact(result)}
    except Exception as exc:
        db.add(ApiLog(endpoint_id=row.id, user_id=user.id, status="failed", duration_ms=int((time.perf_counter()-started)*1000), request_summary=redact(payload.parameters), error=str(exc)[:500]))
        db.commit(); raise

@app.post("/api/endpoints/custom/{endpoint_id}/publish")
def publish_endpoint(endpoint_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.get(Endpoint, endpoint_id)
    if not row: raise HTTPException(404, "接口不存在")
    if row.status != "tested" or row.sample_response is None:
        raise HTTPException(400, "接口必须测试成功并保存脱敏响应样本后才能发布")
    row.status = "published"; db.commit()
    return {"id": row.id, "status": row.status, "version": row.version}

@app.post("/api/endpoints/{endpoint_id}/execute")
async def run_endpoint(endpoint_id: int, payload: ExecuteIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = db.get(Endpoint, endpoint_id); conn = db.get(LingxingConnection, payload.connection_id)
    if not row or row.status != "published" or not conn: raise HTTPException(404, "已发布接口或连接不存在")
    if user.role == "viewer": raise HTTPException(403, "只读用户不能调用接口")
    if row.operation_kind == "write" and (user.role != "admin" or payload.confirmation != row.name):
        raise HTTPException(403, "写接口仅管理员可调用且需要输入完整名称确认")
    started = time.perf_counter()
    try:
        result = await execute_endpoint(row, conn, payload.parameters, db)
        db.add(ApiLog(endpoint_id=row.id, user_id=user.id, status="success", duration_ms=int((time.perf_counter()-started)*1000), request_summary=redact(payload.parameters), response_summary=redact(result)))
        db.commit()
        return {"duration_ms": int((time.perf_counter()-started)*1000), "data": redact(result)}
    except Exception as exc:
        db.add(ApiLog(endpoint_id=row.id, user_id=user.id, status="failed", duration_ms=int((time.perf_counter()-started)*1000), request_summary=redact(payload.parameters), error=str(exc)[:500])); db.commit(); raise

@app.get("/api/jobs")
def list_jobs(_: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Job).order_by(Job.id)).all()

@app.post("/api/jobs")
def create_job(payload: JobIn, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    status = "ready_for_test" if payload.endpoint_id else "waiting_configuration"
    row = Job(**payload.model_dump(), status=status); db.add(row); db.commit(); db.refresh(row)
    return row

@app.post("/api/jobs/{job_id}/validate")
def validate_job(job_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.get(Job, job_id)
    if not row: raise HTTPException(404, "任务不存在")
    endpoint = db.get(Endpoint, row.endpoint_id) if row.endpoint_id else None
    if not endpoint or endpoint.status != "published" or endpoint.operation_kind != "query":
        row.status = "waiting_configuration"; db.commit()
        return {"ok": False, "status": row.status, "message": "等待配置已发布的查询接口"}
    row.status = "ready_for_test"; db.commit()
    return {"ok": True, "status": row.status}

@app.get("/api/audit/api-calls")
def audit(limit: int = 100, _: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(ApiLog).order_by(ApiLog.created_at.desc()).limit(min(limit, 500))).all()
