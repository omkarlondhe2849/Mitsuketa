#!/bin/bash
# ─────────────────────────────────────────────────────────
# start_server.sh
# Runs AFTER install_dependencies.sh completes.
# Starts the Mitsuketa FastAPI app via Uvicorn on port 80.
# NOTE: 1 worker only — SQLite does not support multi-process writes
# ─────────────────────────────────────────────────────────
set -e
exec >> /var/log/mitsuketa-deploy.log 2>&1
echo "======================================================"
echo "[start_server.sh] Started at $(date)"
echo "======================================================"

APP_DIR=/home/ubuntu/mitsuketa

cd "$APP_DIR"

# ── Activate virtual environment ──────────────────────────
echo "[STEP 1] Activating virtual environment..."
source "$APP_DIR/venv/bin/activate"

# ── Start Uvicorn in background ───────────────────────────
echo "[STEP 2] Starting Uvicorn server on port 80 (1 worker for SQLite compatibility)..."
nohup uvicorn main:app \
    --host 0.0.0.0 \
    --port 80 \
    --workers 1 \
    --log-level info \
    >> /var/log/mitsuketa-app.log 2>&1 &

# Save PID
echo $! > /var/run/mitsuketa.pid
echo "  Uvicorn started with PID: $(cat /var/run/mitsuketa.pid)"

# ── Wait and verify process is running ────────────────────
sleep 5
if pgrep -f "uvicorn" > /dev/null 2>&1; then
    echo "[start_server.sh] Uvicorn is running. Server started successfully."
else
    echo "[start_server.sh] ERROR: Uvicorn failed to start!"
    exit 1
fi

echo "[start_server.sh] Completed at $(date)"

