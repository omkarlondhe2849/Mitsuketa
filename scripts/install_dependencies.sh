#!/bin/bash
# ─────────────────────────────────────────────────────────
# install_dependencies.sh
# Runs AFTER CodeDeploy copies files to /home/ubuntu/mitsuketa
# Installs system packages + Python venv + pip requirements
# ─────────────────────────────────────────────────────────
set -e
exec >> /var/log/mitsuketa-deploy.log 2>&1
echo "======================================================"
echo "[install_dependencies.sh] Started at $(date)"
echo "======================================================"

APP_DIR=/home/ubuntu/mitsuketa

cd "$APP_DIR"

# ── System packages ──────────────────────────────────────
echo "[STEP 1] Installing system dependencies..."
apt-get update -y
apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    libsndfile1 \
    libgl1-mesa-glx \
    curl

# ── Python Virtual Environment ───────────────────────────
echo "[STEP 2] Recreating Python virtual environment (ensures pinned versions)..."
# Always recreate venv so pinned versions (like Jinja2==3.1.2) are enforced
rm -rf "$APP_DIR/venv"
python3 -m venv "$APP_DIR/venv"
echo "  Virtual environment created fresh."

# ── Activate venv and install packages ───────────────────
echo "[STEP 3] Installing Python dependencies..."
source "$APP_DIR/venv/bin/activate"
pip install --upgrade pip
pip install -r "$APP_DIR/requirements.txt"

# ── Set correct ownership ─────────────────────────────────
chown -R ubuntu:ubuntu "$APP_DIR"

echo "[install_dependencies.sh] Completed successfully at $(date)"
