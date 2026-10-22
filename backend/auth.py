"""Owner-only Google OAuth login and short-lived signed admin sessions."""
import os
import secrets
import time

import jwt
import requests
from fastapi import Header, HTTPException

APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip().lower()
CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
_configured_secret = os.environ.get("JWT_SECRET", "").strip()
if _configured_secret and len(_configured_secret) < 32:
    raise RuntimeError("JWT_SECRET must be at least 32 characters")
if APP_ENV == "production" and not _configured_secret:
    raise RuntimeError("Set a strong JWT_SECRET before deploying with APP_ENV=production")
SECRET = _configured_secret or secrets.token_urlsafe(48)

ISSUER = "apna-dhandha"
AUDIENCE = "apna-dhandha-admin"
SESSION_SECONDS = 60 * 60


def make_token(email: str) -> str:
    now = int(time.time())
    return jwt.encode(
        {"sub": email, "iat": now, "exp": now + SESSION_SECONDS, "iss": ISSUER, "aud": AUDIENCE},
        SECRET,
        algorithm="HS256",
    )


def verify_google_access_token(access_token: str) -> str:
    """Verify the Google token, its OAuth client, and the single configured owner."""
    if not CLIENT_ID or not ADMIN_EMAIL:
        raise HTTPException(503, "Set GOOGLE_CLIENT_ID and ADMIN_EMAIL to enable admin sign-in")
    try:
        r = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"access_token": access_token},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise HTTPException(502, "Could not reach Google sign-in") from exc
    if r.status_code != 200:
        raise HTTPException(401, "Invalid Google sign-in token")
    try:
        info = r.json()
    except ValueError as exc:
        raise HTTPException(401, "Google returned an invalid token response") from exc
    if CLIENT_ID not in (info.get("aud"), info.get("azp")):
        raise HTTPException(401, "Token was not issued for this app")
    email = str(info.get("email", "")).strip().lower()
    if str(info.get("email_verified", "")).lower() != "true" or not secrets.compare_digest(email, ADMIN_EMAIL):
        raise HTTPException(403, "This Google account is not the configured owner")
    return email


def require_admin(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Login required")
    try:
        data = jwt.decode(
            authorization[7:].strip(),
            SECRET,
            algorithms=["HS256"],
            issuer=ISSUER,
            audience=AUDIENCE,
            options={"require": ["sub", "iat", "exp", "iss", "aud"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(401, "Session expired or invalid; log in again") from exc
    email = str(data.get("sub", "")).strip().lower()
    if not ADMIN_EMAIL or not secrets.compare_digest(email, ADMIN_EMAIL):
        raise HTTPException(403, "Not the configured owner")
    return email
