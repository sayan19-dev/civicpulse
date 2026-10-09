#!/bin/sh
# Civic Pulse - serves the site at http://localhost:8000
cd "$(dirname "$0")"
echo "Open http://localhost:8000/ in your browser (Ctrl+C to stop)"
python3 -m http.server 8000
