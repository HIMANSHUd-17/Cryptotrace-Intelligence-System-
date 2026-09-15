#!/bin/bash

# CryptoTrace Linux Standalone Runner
# This script ensures the system runs offline as a contained software application.

echo "[*] Booting CryptoTrace Forensic Intelligence Engine..."

# Spin up the pre-configured backend and frontend via Docker (No local Python/Node installation required)
docker-compose up -d --build

echo "[*] Waiting for services to initialize..."
sleep 5

echo "[*] Launching Application Window Interface..."
# Launching in Kiosk/App mode gives it a pure "Software" feel (no tabs, no URL bar, no localhost visibility)
if command -v google-chrome &> /dev/null; then
    google-chrome --app=http://localhost:5173
elif command -v chromium &> /dev/null; then
    chromium --app=http://localhost:5173
elif command -v brave-browser &> /dev/null; then
    brave-browser --app=http://localhost:5173
else
    # Fallback to default handler
    xdg-open http://localhost:5173
fi

echo "[*] CryptoTrace is now running as a standalone offline application."
