#!/usr/bin/env bash
# Startar StudyAI lokalt (macOS/Linux). Kör: ./start.sh [port]
cd "$(dirname "$0")" || exit 1
exec python3 server.py "$@"
