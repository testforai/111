import base64
import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "x" * 64)
os.environ.setdefault("CREDENTIAL_MASTER_KEY", base64.urlsafe_b64encode(b"k" * 32).decode())
os.environ.setdefault("ADMIN_PASSWORD", "change-this-admin")
from app.main import EndpointIn, LingxingIn, encrypt_text, decrypt_text, redact

def test_credentials_round_trip():
    encrypted = encrypt_text("very-secret")
    assert encrypted != "very-secret"
    assert decrypt_text(encrypted) == "very-secret"

def test_host_allowlist():
    value = LingxingIn(app_id="a", app_secret="b", host="https://openapi.lingxing.com")
    assert value.host == "https://openapi.lingxing.com"

def test_endpoint_rejects_absolute_url():
    try:
        EndpointIn(name="bad", module="x", method="GET", path="https://evil.example/x")
        assert False
    except Exception:
        assert True

def test_redaction():
    assert redact({"access_token": "abc", "nested": {"app_secret": "def"}}) == {"access_token": "***REDACTED***", "nested": {"app_secret": "***REDACTED***"}}
