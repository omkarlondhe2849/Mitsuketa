#!/bin/bash
# ─────────────────────────────────────────────────────────
# validate_service.sh
# Runs as ValidateService lifecycle hook in CodeDeploy.
# Confirms the Mitsuketa FastAPI server is responding to HTTP.
# ─────────────────────────────────────────────────────────
exec >> /var/log/mitsuketa-deploy.log 2>&1
echo "======================================================"
echo "[validate_service.sh] Started at $(date)"
echo "======================================================"

MAX_RETRIES=10
WAIT_SECONDS=5
URL="http://localhost:80"

echo "[STEP 1] Checking that uvicorn process is alive..."
if ! pgrep -f "uvicorn" > /dev/null 2>&1; then
    echo "  ERROR: uvicorn process not found!"
    exit 1
fi
echo "  uvicorn process is running."

echo "[STEP 2] Waiting for HTTP server to respond on port 80..."
for i in $(seq 1 $MAX_RETRIES); do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" --max-time 5 || true)
    echo "  Attempt $i/$MAX_RETRIES — HTTP status: $HTTP_STATUS"
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "307" ] || [ "$HTTP_STATUS" = "404" ]; then
        echo "  Server is responding. Validation PASSED."
        echo "[validate_service.sh] Completed successfully at $(date)"
        exit 0
    fi
    sleep "$WAIT_SECONDS"
done

echo "ERROR: Server did not respond after $MAX_RETRIES retries."
echo "Check /var/log/mitsuketa-app.log for details."
exit 1
