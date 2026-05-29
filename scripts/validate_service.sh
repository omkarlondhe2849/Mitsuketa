#!/bin/bash
# ─────────────────────────────────────────────────────────
# validate_service.sh
# Runs as ValidateService lifecycle hook in CodeDeploy.
# Confirms the Mitsuketa FastAPI server is bound to port 80.
# ─────────────────────────────────────────────────────────
exec >> /var/log/mitsuketa-deploy.log 2>&1
echo "======================================================"
echo "[validate_service.sh] Started at $(date)"
echo "======================================================"

MAX_RETRIES=10
WAIT_SECONDS=3

echo "[STEP 1] Checking that uvicorn process is alive..."
if ! pgrep -f "uvicorn" > /dev/null 2>&1; then
    echo "  ERROR: uvicorn process not found!"
    exit 1
fi
echo "  uvicorn process is running ✓"

echo "[STEP 2] Checking port 80 is listening..."
for i in $(seq 1 $MAX_RETRIES); do
    if ss -tlnp | grep -q ':80'; then
        echo "  Port 80 is OPEN. Server is ready. Attempt $i/$MAX_RETRIES ✓"
        echo "[validate_service.sh] Validation PASSED at $(date)"
        exit 0
    fi
    echo "  Attempt $i/$MAX_RETRIES — port 80 not yet open, waiting ${WAIT_SECONDS}s..."
    sleep "$WAIT_SECONDS"
done

echo "ERROR: Port 80 is not open after $MAX_RETRIES retries."
exit 1

