"""APNAधंधा backend: FastAPI + MongoDB, two-way Google Sheet sync, Drive music proxy, owner-only admin."""
import os, uuid, asyncio, logging, random, time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend"
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, HTTPException, Depends, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pymongo.errors import ServerSelectionTimeoutError
import requests
from starlette.background import BackgroundTask
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
import backend.auth as auth, backend.google_sync as gs

log = logging.getLogger("apna")
mongo_client = AsyncIOMotorClient(
    os.environ.get("MONGO_URL", "mongodb://localhost:27017"),
    serverSelectionTimeoutMS=3000,
)
db = mongo_client[os.environ.get("DB_NAME", "apna_dhandha")]
ideas, tomb = db.ideas, db.deleted
FIELDS = gs.FIELDS
STATUSES = {"Pending", "Approved", "Rejected"}
state = {"synced_at": None, "error": None}
lock = asyncio.Lock()
now = lambda: datetime.now(timezone.utc).isoformat()

class IdeaIn(BaseModel):
    name: str = Field("", max_length=60)
    problem: str = Field(..., min_length=3, max_length=600)
    solution: str = Field("", max_length=600)
    category: str = Field("", max_length=40)
    instagram: str = Field("", max_length=120)
    linkedin: str = Field("", max_length=300)
    twitter: str = Field("", max_length=120)
class VoteIn(BaseModel):
    dir: str
    prev: Optional[str] = None
class StatusIn(BaseModel):
    status: str
class EditIn(BaseModel):
    problem: Optional[str] = Field(None, min_length=3, max_length=600)
    solution: Optional[str] = Field(None, max_length=600)
    name: Optional[str] = Field(None, max_length=60)
    category: Optional[str] = Field(None, max_length=40)
    instagram: Optional[str] = Field(None, max_length=120)
    linkedin: Optional[str] = Field(None, max_length=300)
    twitter: Optional[str] = Field(None, max_length=120)
class LoginIn(BaseModel):
    access_token: str = Field(..., min_length=20, max_length=8192)
class BulkIn(BaseModel):
    items: List[dict]

def new_doc(x, status="Pending"):
    return {"_id": uuid.uuid4().hex, "name": str(x.get("name", "")).strip()[:60], "problem": str(x.get("problem", "")).strip()[:600],
            "solution": str(x.get("solution", "")).strip()[:600], "category": str(x.get("category", "")).strip()[:40],
            "instagram": str(x.get("instagram", "")).strip()[:120], "linkedin": str(x.get("linkedin", "")).strip()[:300],
            "twitter": str(x.get("twitter", "")).strip()[:120],
            "status": status, "up": 0, "down": 0, "created": now()}

def out(d):
    return {"id": d["_id"], **{k: d.get(k, "") for k in FIELDS}, "up": d.get("up", 0), "down": d.get("down", 0), "created": d.get("created", "")}

# ---------- Sheet <-> DB sync ----------
# Each doc remembers a hash of what we last wrote to its sheet row. If the row's hash differs, someone edited the Sheet
# by hand, so the Sheet wins for that row. Otherwise the database wins. Votes always come from the database.
async def do_sync():
    if not gs.sheet_enabled(): return
    async with lock:
        try:
            await db.command("ping")
            rows = await run_in_threadpool(gs.read_rows)
            docs = {d["_id"]: d async for d in ideas.find()}
            dead = {t["_id"] async for t in tomb.find()}
            seen = set()
            for r in rows:
                rid = r["id"]
                if rid and rid in dead: continue
                if rid and rid in docs:
                    seen.add(rid)
                    if gs.row_hash(r) != docs[rid].get("sheet_hash"):
                        ch = {k: r[k] for k in FIELDS}
                        docs[rid].update(ch); await ideas.update_one({"_id": rid}, {"$set": ch})
                else:
                    nd = new_doc(r, r["status"]); nd["up"], nd["down"] = r["up"], r["down"]
                    if rid: nd["_id"] = rid
                    if r["created"]: nd["created"] = r["created"]
                    await ideas.insert_one(nd); docs[nd["_id"]] = nd; seen.add(nd["_id"])
            for rid, d in list(docs.items()):          # row deleted by hand in the Sheet
                if rid not in seen and d.get("sheet_hash"):
                    await ideas.delete_one({"_id": rid}); del docs[rid]
            allv = sorted(docs.values(), key=lambda d: d.get("created", ""))
            await run_in_threadpool(gs.write_rows, allv)
            for d in allv: await ideas.update_one({"_id": d["_id"]}, {"$set": {"sheet_hash": gs.row_hash(d)}})
            state.update(synced_at=now(), error=None)
        except ServerSelectionTimeoutError:
            state["error"] = "MongoDB is unavailable. Start the MongoDB service and retry."
            log.warning("Sheet sync skipped because MongoDB is unavailable")
        except Exception as e:
            log.exception("sheet sync failed"); state["error"] = str(e)[:240]

def kick(): asyncio.get_running_loop().create_task(do_sync())

async def loop_sync():
    while True:
        await do_sync(); await asyncio.sleep(int(os.environ.get("SYNC_SECONDS", "60")))

@asynccontextmanager
async def lifespan(app):
    t = asyncio.create_task(loop_sync()); yield; t.cancel()

APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017").strip()
cors_setting = os.environ.get("CORS_ORIGINS", "").strip()
if not cors_setting:
    cors_setting = os.environ.get("RENDER_EXTERNAL_URL", "") or "http://localhost:8000,http://127.0.0.1:8000"
CORS_ORIGINS = [origin.strip().rstrip("/") for origin in cors_setting.split(",") if origin.strip()]
if APP_ENV == "production":
    required = {
        "MONGO_URL": MONGO_URL,
        "JWT_SECRET": os.environ.get("JWT_SECRET", "").strip(),
        "ADMIN_EMAIL": auth.ADMIN_EMAIL,
        "GOOGLE_CLIENT_ID": auth.CLIENT_ID,
        "GOOGLE_SHEET_ID": os.environ.get("GOOGLE_SHEET_ID", "").strip(),
        "GOOGLE_DRIVE_FOLDER_ID": os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "").strip(),
        "GOOGLE_SERVICE_ACCOUNT_JSON": os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip(),
        "CORS_ORIGINS": ",".join(CORS_ORIGINS),
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise RuntimeError("Production configuration is missing: " + ", ".join(missing))
    if MONGO_URL.startswith(("mongodb://localhost", "mongodb://127.0.0.1")):
        raise RuntimeError("Production MONGO_URL must point to a reachable hosted MongoDB deployment")
    if not CORS_ORIGINS or "*" in CORS_ORIGINS:
        raise RuntimeError("Production CORS_ORIGINS must list your website origin; wildcard is not allowed")
    if any(not origin.startswith("https://") for origin in CORS_ORIGINS):
        raise RuntimeError("Production CORS_ORIGINS must contain HTTPS website origins only")
    try:
        gs.creds()
    except Exception:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON must point to a valid service-account key") from None

app = FastAPI(
    title="APNA Dhanda",
    lifespan=lifespan,
    docs_url=None if APP_ENV == "production" else "/docs",
    redoc_url=None if APP_ENV == "production" else "/redoc",
    openapi_url=None if APP_ENV == "production" else "/openapi.json",
)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type"], allow_credentials=False)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' https://accounts.google.com https://apis.google.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self' blob:; connect-src 'self' https://oauth2.googleapis.com https://accounts.google.com https://www.googleapis.com; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

@app.get("/")
async def home(): return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/styles.css")
async def frontend_styles(): return FileResponse(FRONTEND_DIR / "styles.css", media_type="text/css")

@app.get("/app.js")
async def frontend_script(): return FileResponse(FRONTEND_DIR / "app.js", media_type="text/javascript")

@app.exception_handler(ServerSelectionTimeoutError)
async def mongo_unavailable(request, exc):
    return JSONResponse(status_code=503, content={"detail": "MongoDB is unavailable. Start the MongoDB service and retry."})

@app.get("/api/health")
async def health():
    await db.command("ping")
    return {"ok": True, "database": "connected"}

@app.get("/api/config")
async def config(): return {"googleClientId": auth.CLIENT_ID}

# ---------- public ----------
@app.get("/api/spin")
async def spin():
    # Sample all approved ideas together so categories and blank tags never change an idea's odds.
    got = await ideas.aggregate([{"$match": {"status": "Approved"}}, {"$sample": {"size": 1}}]).to_list(1)
    if got: return out(got[0])
    raise HTTPException(404, "No ideas yet")

@app.post("/api/ideas")
async def submit(i: IdeaIn):
    await ideas.insert_one(new_doc(i.model_dump())); kick(); return {"ok": True}

@app.post("/api/ideas/{iid}/vote")
async def vote(iid: str, v: VoteIn):
    if v.dir not in ("up", "down"): raise HTTPException(400, "bad vote")
    inc = {v.dir: 1}
    if v.prev in ("up", "down") and v.prev != v.dir: inc[v.prev] = -1
    d = await ideas.find_one_and_update({"_id": iid, "status": "Approved"}, {"$inc": inc}, return_document=True)
    if not d: raise HTTPException(404, "Not found")
    return {"up": max(0, d["up"]), "down": max(0, d["down"])}

@app.get("/api/songs")
async def songs(): return {"songs": await run_in_threadpool(gs.list_songs, True)}

def stream_drive_response(r):
    try:
        for chunk in r.iter_content(65536):
            if chunk:
                yield chunk
    except requests.RequestException as e:
        log.warning("Drive audio stream interrupted (%s)", type(e).__name__)
    finally:
        r.close()

@app.get("/api/songs/{fid}/stream")
async def stream(fid: str, request: Request):
    meta = next((s for s in await run_in_threadpool(gs.list_songs) if s["id"] == fid), None)
    if not meta: raise HTTPException(404, "No such song")
    try:
        r = await run_in_threadpool(gs.open_stream, fid, request.headers.get("range"))
    except requests.RequestException as e:
        log.warning("Drive could not open audio file (%s)", type(e).__name__)
        raise HTTPException(502, "Google Drive is temporarily unavailable. Try again later.") from e
    if r.status_code not in (200, 206):
        r.close(); raise HTTPException(502, "Drive refused the file")
    h = {k: r.headers[k] for k in ("Content-Length", "Content-Range") if k in r.headers}
    h.update({"Accept-Ranges": "bytes", "Cache-Control": "public, max-age=3600"})
    ct = r.headers.get("Content-Type", "")
    return StreamingResponse(stream_drive_response(r), status_code=r.status_code, headers=h,
                             media_type=ct if ct.startswith("audio/") else "audio/mpeg", background=BackgroundTask(r.close))

# ---------- admin ----------
_login_attempts = {}

def limit_login_attempts(address: str):
    now_mono = time.monotonic()
    recent = [stamp for stamp in _login_attempts.get(address, []) if now_mono - stamp < 60]
    if len(recent) >= 8:
        raise HTTPException(429, "Too many login attempts. Wait one minute and try again.")
    recent.append(now_mono)
    _login_attempts[address] = recent
    if len(_login_attempts) > 4096:
        for key in list(_login_attempts):
            kept = [stamp for stamp in _login_attempts[key] if now_mono - stamp < 60]
            if kept:
                _login_attempts[key] = kept
            else:
                del _login_attempts[key]

@app.post("/api/auth/google")
async def login(b: LoginIn, request: Request):
    limit_login_attempts(request.client.host if request.client else "unknown")
    email = await run_in_threadpool(auth.verify_google_access_token, b.access_token)
    return {"token": auth.make_token(email), "email": email}

@app.get("/api/admin/ideas")
async def admin_list(email: str = Depends(auth.require_admin)):
    docs = await ideas.find().sort("created", -1).to_list(5000)
    return {"ideas": [out(d) for d in docs], "songCount": len(await run_in_threadpool(gs.list_songs)),
            "email": email, "syncedAt": state["synced_at"], "sheetError": state["error"]}

@app.post("/api/admin/ideas/{iid}/status")
async def set_status(iid: str, b: StatusIn, _: str = Depends(auth.require_admin)):
    if b.status not in STATUSES: raise HTTPException(400, "bad status")
    if not (await ideas.update_one({"_id": iid}, {"$set": {"status": b.status}})).matched_count: raise HTTPException(404, "Not found")
    kick(); return {"ok": True}

@app.patch("/api/admin/ideas/{iid}")
async def edit(iid: str, b: EditIn, _: str = Depends(auth.require_admin)):
    ch = {k: v.strip() for k, v in b.model_dump().items() if v is not None}
    if ch and not (await ideas.update_one({"_id": iid}, {"$set": ch})).matched_count: raise HTTPException(404, "Not found")
    kick(); return {"ok": True}

@app.delete("/api/admin/ideas/{iid}")
async def delete(iid: str, _: str = Depends(auth.require_admin)):
    await ideas.delete_one({"_id": iid}); await tomb.update_one({"_id": iid}, {"$set": {"at": now()}}, upsert=True)
    kick(); return {"ok": True}

@app.post("/api/admin/ideas/bulk")
async def bulk(b: BulkIn, _: str = Depends(auth.require_admin)):
    docs = [new_doc(x, "Approved") for x in b.items[:500] if str(x.get("problem", "")).strip()]
    if docs: await ideas.insert_many(docs)
    kick(); return {"ok": True, "imported": len(docs)}

@app.post("/api/admin/sync")
async def sync_now(_: str = Depends(auth.require_admin)):
    if not gs.sheet_enabled(): raise HTTPException(503, "Google Sheets sync is not configured.")
    await do_sync()
    if state["error"]: raise HTTPException(502, "Sheet sync failed: " + state["error"])
    return {"ok": True, "syncedAt": state["synced_at"]}
