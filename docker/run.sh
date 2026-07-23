#!/bin/sh
# Container dispatcher.
#
# Grader mode: the scoring harness mounts /input/tasks.json and expects
# /output/results.json. When that file is present we run the batch pipeline
# and exit — we must NOT start a long-lived web server, or the grader waits
# forever and reports TIMEOUT.
#
# Server mode: no grader input present (local dev, docker-compose, Fly.io) —
# serve the frontend via nginx and the API via uvicorn.

set -e

if [ -f /input/tasks.json ]; then
    echo "[run.sh] Grader input detected at /input/tasks.json — running batch pipeline."
    exec python /app/backend/entrypoint.py
else
    echo "[run.sh] No grader input — starting web server."
    # nginx only exists in the full (frontend) image; the lean grader image
    # skips it and serves the API directly.
    if command -v nginx >/dev/null 2>&1; then
        nginx -g 'daemon on;'
        exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
    else
        exec uvicorn backend.main:app --host 0.0.0.0 --port 80
    fi
fi
