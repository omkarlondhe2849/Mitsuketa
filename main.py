"""
Mitsuketa – Find the Source
FastAPI Backend Application
"""

import os
import shutil
import uuid
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import JSONResponse

from database import init_db, add_media, store_audio_fingerprints, store_video_fingerprints, get_all_media, delete_media, get_media_by_id, get_media_count
from audio_fingerprint import fingerprint_file as audio_fp, get_audio_duration
from video_fingerprint import fingerprint_video as video_fp, get_video_duration
from matcher import identify_clip

# ─── App Setup ───────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR = os.path.join(BASE_DIR, "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

app = FastAPI(
    title="Mitsuketa – Find the Source",
    description="Audio & Video Fingerprinting System",
    version="1.0.0"
)

# Serve static files
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Templates
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

# Initialize database on startup
@app.on_event("startup")
async def startup():
    init_db()


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
async def home(request: Request):
    """Serve the main web interface."""
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/register")
async def register_media(
    file: UploadFile = File(...),
    title: str = Form(...),
    media_type: str = Form("unknown")
):
    """
    Register a reference media file.
    Extracts audio & video fingerprints and stores them in the database.
    """
    # Validate media type
    if media_type not in ('song', 'movie', 'unknown'):
        media_type = 'unknown'

    # Save uploaded file
    ext = os.path.splitext(file.filename)[1].lower()
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(MEDIA_DIR, safe_filename)

    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Get duration
    video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'}
    audio_extensions = {'.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.wma'}

    duration = 0.0
    if ext in video_extensions:
        duration = get_video_duration(file_path)
    elif ext in audio_extensions:
        duration = get_audio_duration(file_path)

    # Store in database
    media_id = add_media(title, media_type, file_path, duration)

    # Extract fingerprints — always try BOTH audio and video
    audio_count = 0
    video_count = 0
    errors = []

    # Audio fingerprinting (for all file types)
    try:
        audio_fps = audio_fp(file_path)
        if audio_fps:
            store_audio_fingerprints(media_id, audio_fps)
            audio_count = len(audio_fps)
    except Exception as e:
        errors.append(f"Audio fingerprinting: {str(e)}")

    # Video fingerprinting (for all file types — OpenCV will skip if no video)
    try:
        video_fps = video_fp(file_path)
        if video_fps:
            store_video_fingerprints(media_id, video_fps)
            video_count = len(video_fps)
    except Exception as e:
        errors.append(f"Video fingerprinting: {str(e)}")

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
    """
    # Save uploaded file temporarily
    ext = os.path.splitext(file.filename)[1].lower()
    safe_filename = f"query_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(MEDIA_DIR, safe_filename)

    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Run identification
        result = identify_clip(file_path)

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
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Identification failed: {str(e)}")

    finally:
        # Clean up temp query file
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            pass


@app.get("/api/library")
async def get_library():
    """Get all registered media."""
    media_list = get_all_media()
    return {
        "success": True,
        "total": len(media_list),
        "media": media_list
    }


@app.delete("/api/library/{media_id}")
async def remove_media(media_id: int):
    """Delete a registered media and its fingerprints."""
    media = get_media_by_id(media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Delete the file if it exists
    if media.get('file_path') and os.path.exists(media['file_path']):
        try:
            os.remove(media['file_path'])
        except OSError:
            pass

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
