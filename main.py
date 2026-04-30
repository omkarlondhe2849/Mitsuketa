"""
Mitsuketa – Find the Source
FastAPI Backend Application
"""

import os
import shutil
import uuid
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware

from database import (
    init_db, add_media, store_audio_fingerprints, store_video_fingerprints,
    get_all_media, delete_media, get_media_by_id, get_media_count
)
from audio_fingerprint import fingerprint_file as audio_fp, get_audio_duration
from video_fingerprint import fingerprint_video as video_fp, get_video_duration
from matcher import identify_clip, invalidate_bktree_cache

# ─── App Setup ───────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR = os.path.join(BASE_DIR, "media")
FRONTEND_BUILD = os.path.join(BASE_DIR, "frontend", "dist")
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB

os.makedirs(MEDIA_DIR, exist_ok=True)

# Thread pool for CPU-heavy fingerprinting (keeps FastAPI async loop free)
executor = ThreadPoolExecutor(max_workers=4)

app = FastAPI(
    title="Mitsuketa – Find the Source",
    description="Audio & Video Fingerprinting System",
    version="2.0.0"
)

# CORS — required for React dev server proxy and future AWS deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve existing static files (CSS/JS for legacy fallback)
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Serve React build assets (when frontend/dist/ exists)
_react_assets_dir = os.path.join(FRONTEND_BUILD, "assets")
if os.path.exists(_react_assets_dir):
    app.mount("/assets", StaticFiles(directory=_react_assets_dir), name="react_assets")

# Templates (legacy fallback)
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


@app.on_event("startup")
async def startup():
    init_db()


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    """Health check endpoint — used by AWS load balancers and monitoring."""
    return {"status": "ok", "version": "2.0.0", "media_count": get_media_count()}


@app.get("/")
async def home(request: Request):
    """
    Serve the UI.
    - If React build exists → serve React's index.html
    - If Jinja2 template exists → serve legacy template
    - Otherwise → return JSON health response
    """
    react_index = os.path.join(FRONTEND_BUILD, "index.html")
    if os.path.exists(react_index):
        return FileResponse(react_index)

    template_index = os.path.join(BASE_DIR, "templates", "index.html")
    if os.path.exists(template_index):
        return templates.TemplateResponse("index.html", {"request": request})

    # Fallback: return JSON if no UI is available
    return JSONResponse({
        "status": "ok",
        "app": "Mitsuketa – Find the Source",
        "version": "2.0.0",
        "message": "API is running. Use /api/health, /api/library, /api/register, /api/identify",
        "endpoints": ["/api/health", "/api/library", "/api/register", "/api/identify", "/api/stats"]
    })


@app.post("/api/register")
async def register_media(
    file: UploadFile = File(...),
    title: str = Form(...),
    media_type: str = Form("unknown")
):
    """
    Register a reference media file.
    Extracts audio & video fingerprints and stores them in the database.
    Uses async thread executor to avoid blocking the event loop.
    """
    if media_type not in ('song', 'movie', 'unknown'):
        media_type = 'unknown'

    # Read and validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 500 MB)")

    # Save uploaded file
    ext = os.path.splitext(file.filename)[1].lower()
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(MEDIA_DIR, safe_filename)

    try:
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Get duration
    loop = asyncio.get_event_loop()
    video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'}
    audio_extensions = {'.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.wma'}

    duration = 0.0
    if ext in video_extensions:
        duration = await loop.run_in_executor(executor, get_video_duration, file_path)
    elif ext in audio_extensions:
        duration = await loop.run_in_executor(executor, get_audio_duration, file_path)

    # Store in database
    media_id = add_media(title, media_type, file_path, duration)

    # Extract fingerprints in thread executor (CPU-heavy, non-blocking)
    audio_count = 0
    video_count = 0
    errors = []

    try:
        audio_fps_list = await loop.run_in_executor(executor, audio_fp, file_path)
        if audio_fps_list:
            store_audio_fingerprints(media_id, audio_fps_list)
            audio_count = len(audio_fps_list)
    except Exception as e:
        errors.append(f"Audio fingerprinting: {str(e)}")

    try:
        video_fps_list = await loop.run_in_executor(executor, video_fp, file_path)
        if video_fps_list:
            store_video_fingerprints(media_id, video_fps_list)
            video_count = len(video_fps_list)
    except Exception as e:
        errors.append(f"Video fingerprinting: {str(e)}")

    # Invalidate BK-Tree cache so next video match uses updated data
    invalidate_bktree_cache()

    return {
        "success": True,
        "media_id": media_id,
        "title": title,
        "media_type": media_type,
        "audio_fingerprints": audio_count,
        "video_fingerprints": video_count,
        "duration": round(duration, 2),
        "warnings": errors if errors else None
    }


@app.post("/api/identify")
async def identify_media(file: UploadFile = File(...)):
    """
    Upload an unknown clip and identify it using fingerprint matching.
    Uses thread executor to run CPU-heavy identification non-blocking.
    """
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 500 MB)")

    ext = os.path.splitext(file.filename)[1].lower()
    safe_filename = f"query_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(MEDIA_DIR, safe_filename)

    try:
        with open(file_path, "wb") as f:
            f.write(content)

        # Run identification in thread pool (non-blocking)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(executor, identify_clip, file_path)

        return {
            "success": True,
            "match_found": result['match_found'],
            "title": result['title'],
            "media_id": result['media_id'],
            "confidence": result['confidence'],
            "method_used": result['method_used'],
            "audio_results": result['audio_results'][:5],
            "video_results": result['video_results'][:5],
            "analysis_steps": result.get('analysis_steps', []),
            "media_details": result.get('media_details'),
            "total_audio_fps": result.get('total_audio_fps', 0),
            "total_video_fps": result.get('total_video_fps', 0),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Identification failed: {str(e)}")

    finally:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass


@app.get("/api/library")
async def get_library():
    """Get all registered media."""
    media_list = get_all_media()
    return {"success": True, "total": len(media_list), "media": media_list}


@app.delete("/api/library/{media_id}")
async def remove_media(media_id: int):
    """Delete a registered media and all its fingerprints."""
    media = get_media_by_id(media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if media.get('file_path') and os.path.exists(media['file_path']):
        try:
            os.remove(media['file_path'])
        except OSError:
            pass

    # Invalidate BK-Tree so deleted media is removed from video index
    invalidate_bktree_cache()

    deleted = delete_media(media_id)
    return {"success": deleted}


@app.get("/api/stats")
async def get_stats():
    """Get system statistics."""
    media_list = get_all_media()
    total_audio = sum(m.get('audio_fp_count', 0) for m in media_list)
    total_video = sum(m.get('video_fp_count', 0) for m in media_list)

    return {
        "total_media": len(media_list),
        "total_audio_fingerprints": total_audio,
        "total_video_fingerprints": total_video,
        "songs": sum(1 for m in media_list if m['media_type'] == 'song'),
        "movies": sum(1 for m in media_list if m['media_type'] == 'movie'),
    }


# ─── React Catch-All (Client-Side Routing) ───────────────────────────────────
# Serves React's index.html for any non-API route so React Router works correctly

@app.get("/{full_path:path}")
async def serve_react_catchall(full_path: str):
    """Catch-all for React client-side routing (production only)."""
    react_index = os.path.join(FRONTEND_BUILD, "index.html")
    if os.path.exists(react_index):
        return FileResponse(react_index)
    raise HTTPException(status_code=404, detail="Not found")
