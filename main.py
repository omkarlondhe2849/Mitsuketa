"""
Mitsuketa – Find the Source
FastAPI Backend v3.0 — JWT Auth + PostgreSQL (psycopg2, no ORM)
"""

import os
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# ── Database (direct psycopg2) ────────────────────────────────────────────────
from database import (
    init_db,
    # users
    create_user, get_user_by_username, get_user_by_email,
    get_user_by_id, get_all_users, count_users,
    update_user_role, set_user_active,
    # media
    add_media, get_all_media, get_media_by_id, delete_media, get_media_count,
    # fingerprints
    store_audio_fingerprints, store_video_fingerprints,
)

# ── Auth ──────────────────────────────────────────────────────────────────────
from auth.core import hash_password, verify_password, create_access_token
from auth.schemas import (
    UserRegister, UserLogin, TokenResponse, UserResponse,
    RoleUpdate, AdminCreateUser,
)
from auth.dependencies import (
    get_current_user, require_authenticated,
    require_moderator, require_admin,
)

# ── Fingerprinting ────────────────────────────────────────────────────────────
from audio_fingerprint import fingerprint_file as audio_fp, get_audio_duration
from video_fingerprint import fingerprint_video as video_fp, get_video_duration
from matcher import identify_clip, invalidate_bktree_cache

load_dotenv()

# ─── App Setup ────────────────────────────────────────────────────────────────

BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR      = os.path.join(BASE_DIR, "media")
FRONTEND_BUILD = os.path.join(BASE_DIR, "frontend", "dist")
MAX_FILE_SIZE  = 2000 * 1024 * 1024   # 2000 MB (2GB)

os.makedirs(MEDIA_DIR, exist_ok=True)

executor = ThreadPoolExecutor(max_workers=4)

app = FastAPI(
    title="Mitsuketa – Find the Source",
    description="Audio & Video Fingerprinting with JWT Auth + PostgreSQL",
    version="3.0.0",
)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static / React build
_static = os.path.join(BASE_DIR, "static")
if os.path.exists(_static) and os.listdir(_static):
    app.mount("/static", StaticFiles(directory=_static), name="static")

_assets = os.path.join(FRONTEND_BUILD, "assets")
if os.path.exists(_assets):
    app.mount("/assets", StaticFiles(directory=_assets), name="react_assets")


# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """Create DB tables and auto-create first admin if none exist."""
    try:
        init_db()
    except Exception as e:
        print(f"[STARTUP] DB init warning: {e}")

    # Auto-create first admin if users table is empty
    try:
        if count_users() == 0:
            uname = os.getenv("FIRST_ADMIN_USERNAME", "admin")
            pwd   = os.getenv("FIRST_ADMIN_PASSWORD", "Admin@123")
            email = os.getenv("FIRST_ADMIN_EMAIL", "admin@mitsuketa.local")
            create_user(uname, email, hash_password(pwd), role="admin")
            print(f"[STARTUP] Default admin created → username: '{uname}'")
    except Exception as e:
        print(f"[STARTUP] Could not create admin: {e}")


# ─── Auth Routes (Public) ─────────────────────────────────────────────────────

@app.post("/api/auth/register", status_code=201)
async def register_user(payload: UserRegister):
    """Public signup — new users get 'viewer' role automatically."""
    if get_user_by_username(payload.username):
        raise HTTPException(400, "Username already taken")
    if get_user_by_email(payload.email):
        raise HTTPException(400, "Email already registered")

    user = create_user(
        payload.username,
        payload.email,
        hash_password(payload.password),
        role="viewer",
    )
    return _user_response(user)


@app.post("/api/auth/login")
async def login(payload: UserLogin):
    """Login with username + password → returns JWT token."""
    user = get_user_by_username(payload.username)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Incorrect username or password")
    if not user["is_active"]:
        raise HTTPException(403, "Account deactivated. Contact an administrator.")

    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_response(user),
    }


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return current user's profile."""
    return _user_response(current_user)


# ─── Admin Routes ─────────────────────────────────────────────────────────────

@app.get("/api/admin/users")
async def list_users(_: dict = Depends(require_admin)):
    users = get_all_users()
    return {"success": True, "total": len(users), "users": [_user_response(u) for u in users]}


@app.post("/api/admin/users", status_code=201)
async def admin_create_user(payload: AdminCreateUser, _: dict = Depends(require_admin)):
    if get_user_by_username(payload.username):
        raise HTTPException(400, "Username already taken")
    if get_user_by_email(payload.email):
        raise HTTPException(400, "Email already registered")
    user = create_user(payload.username, payload.email, hash_password(payload.password), payload.role)
    return _user_response(user)


@app.patch("/api/admin/users/{user_id}/role")
async def change_role(user_id: int, payload: RoleUpdate, _: dict = Depends(require_admin)):
    user = update_user_role(user_id, payload.role)
    if not user:
        raise HTTPException(404, "User not found")
    return _user_response(user)


@app.patch("/api/admin/users/{user_id}/deactivate")
async def deactivate_user(user_id: int, _: dict = Depends(require_admin)):
    if not set_user_active(user_id, False):
        raise HTTPException(404, "User not found")
    return {"success": True, "message": "User deactivated"}


@app.patch("/api/admin/users/{user_id}/activate")
async def activate_user(user_id: int, _: dict = Depends(require_admin)):
    if not set_user_active(user_id, True):
        raise HTTPException(404, "User not found")
    return {"success": True, "message": "User activated"}


# ─── Health (Public) ──────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    try:
        count = get_media_count()
    except Exception:
        count = 0
    return {"status": "ok", "version": "3.0.0", "media_count": count}


# ─── Media Routes (Protected) ─────────────────────────────────────────────────

@app.post("/api/register")
async def register_media(
    file: UploadFile = File(...),
    title: str = Form(...),
    media_type: str = Form("unknown"),
    current_user: dict = Depends(require_moderator),
):
    """Register a reference media file (moderator + admin only)."""
    if media_type not in ("song", "movie", "unknown"):
        media_type = "unknown"

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 2 GB)")

    ext = os.path.splitext(file.filename)[1].lower()
    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(MEDIA_DIR, safe_name)

    try:
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(500, f"Failed to save file: {e}")

    loop = asyncio.get_event_loop()
    video_exts = {".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm"}
    audio_exts = {".mp3", ".wav", ".flac", ".ogg", ".aac", ".m4a", ".wma"}

    duration = 0.0
    if ext in video_exts:
        duration = await loop.run_in_executor(executor, get_video_duration, file_path)
    elif ext in audio_exts:
        duration = await loop.run_in_executor(executor, get_audio_duration, file_path)

    media_id = add_media(title, media_type, file_path, duration, current_user["id"])

    audio_count, video_count, errors = 0, 0, []

    try:
        fps = await loop.run_in_executor(executor, audio_fp, file_path)
        if fps:
            store_audio_fingerprints(media_id, fps)
            audio_count = len(fps)
    except Exception as e:
        errors.append(f"Audio: {e}")

    try:
        fps = await loop.run_in_executor(executor, video_fp, file_path)
        if fps:
            store_video_fingerprints(media_id, fps)
            video_count = len(fps)
    except Exception as e:
        errors.append(f"Video: {e}")

    invalidate_bktree_cache()

    return {
        "success": True,
        "media_id": media_id,
        "title": title,
        "media_type": media_type,
        "audio_fingerprints": audio_count,
        "video_fingerprints": video_count,
        "duration": round(duration, 2),
        "warnings": errors or None,
    }


@app.post("/api/identify")
async def identify_media(
    file: UploadFile = File(...),
    _: dict = Depends(require_authenticated),
):
    """Identify an unknown clip (all authenticated users)."""
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 2 GB)")

    ext = os.path.splitext(file.filename)[1].lower()
    file_path = os.path.join(MEDIA_DIR, f"query_{uuid.uuid4().hex}{ext}")

    try:
        with open(file_path, "wb") as f:
            f.write(content)

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(executor, identify_clip, file_path)

        return {
            "success": True,
            "match_found":    result["match_found"],
            "title":          result["title"],
            "media_id":       result["media_id"],
            "confidence":     result["confidence"],
            "method_used":    result["method_used"],
            "audio_results":  result["audio_results"][:5],
            "video_results":  result["video_results"][:5],
            "analysis_steps": result.get("analysis_steps", []),
            "media_details":  result.get("media_details"),
            "total_audio_fps": result.get("total_audio_fps", 0),
            "total_video_fps": result.get("total_video_fps", 0),
        }
    except Exception as e:
        raise HTTPException(500, f"Identification failed: {e}")
    finally:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass


@app.get("/api/library")
async def get_library(_: dict = Depends(require_authenticated)):
    """Get all registered media (all authenticated users)."""
    media_list = get_all_media()
    return {"success": True, "total": len(media_list), "media": media_list}


@app.delete("/api/library/{media_id}")
async def remove_media(media_id: int, _: dict = Depends(require_admin)):
    """Delete a media entry and all its fingerprints (admin only)."""
    media = get_media_by_id(media_id)
    if not media:
        raise HTTPException(404, "Media not found")
    if media.get("file_path") and os.path.exists(media["file_path"]):
        try:
            os.remove(media["file_path"])
        except OSError:
            pass
    invalidate_bktree_cache()
    return {"success": delete_media(media_id)}


@app.get("/api/stats")
async def get_stats(_: dict = Depends(require_authenticated)):
    """System statistics (all authenticated users)."""
    media_list = get_all_media()
    return {
        "total_media":              len(media_list),
        "total_audio_fingerprints": sum(m.get("audio_fp_count", 0) for m in media_list),
        "total_video_fingerprints": sum(m.get("video_fp_count", 0) for m in media_list),
        "songs":   sum(1 for m in media_list if m["media_type"] == "song"),
        "movies":  sum(1 for m in media_list if m["media_type"] == "movie"),
    }


# ─── React Catch-All ──────────────────────────────────────────────────────────

@app.get("/")
async def home():
    react_index = os.path.join(FRONTEND_BUILD, "index.html")
    if os.path.exists(react_index):
        return FileResponse(react_index)
    template_index = os.path.join(BASE_DIR, "templates", "index.html")
    if os.path.exists(template_index):
        return FileResponse(template_index, media_type="text/html")
    return JSONResponse({"status": "ok", "app": "Mitsuketa", "version": "3.0.0"})


@app.get("/{full_path:path}")
async def spa_catchall(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(404, "Not found")
    react_index = os.path.join(FRONTEND_BUILD, "index.html")
    if os.path.exists(react_index):
        return FileResponse(react_index)
    raise HTTPException(404, "Not found")


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _user_response(user: dict) -> dict:
    """Strip password_hash before returning user data to client."""
    return {
        "id":         user["id"],
        "username":   user["username"],
        "email":      user["email"],
        "role":       user["role"],
        "is_active":  user["is_active"],
        "created_at": str(user["created_at"]),
    }
