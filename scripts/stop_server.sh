#!/bin/bash
# ─────────────────────────────────────────────────────────
# stop_server.sh
# Runs BEFORE CodeDeploy copies new files.
# Gracefully stops any running Mitsuketa server instances.
# ─────────────────────────────────────────────────────────
set -e
exec >> /var/log/mitsuketa-deploy.log 2>&1
echo "======================================================"
echo "[stop_server.sh] Started at $(date)"
echo "======================================================"

# ── Stop systemd service if it exists ────────────────────
if systemctl is-active --quiet mitsuketa.service 2>/dev/null; then
    echo "[STEP 1] Stopping mitsuketa.service via systemd..."
    systemctl stop mitsuketa.service
    echo "  mitsuketa.service stopped."
else
    echo "[STEP 1] mitsuketa.service not running (systemd). Skipping."
fi

# ── Kill any loose uvicorn processes ─────────────────────
echo "[STEP 2] Killing any running uvicorn processes..."
if pgrep -f "uvicorn" > /dev/null 2>&1; then
    pkill -SIGTERM -f "uvicorn" || true
    sleep 3
    # Force kill if still running
    pkill -SIGKILL -f "uvicorn" || true
    echo "  uvicorn processes stopped."
else
    echo "  No uvicorn processes found."
fi

# ── Kill any loose main.py processes ─────────────────────
echo "[STEP 3] Killing any running main.py processes..."
pkill -f "main.py" || true

echo "[stop_server.sh] Completed at $(date)"
