@echo off
title CryptoTrace Forensic Engine Launcher
color 0b

echo =======================================================
echo          CryptoTrace ML Startup Sequence
echo =======================================================
echo.

echo [+] Launching FastAPI Machine Learning Backend...
start "CryptoTrace ML Backend" cmd /k "cd backend && uvicorn main:app --reload --port 8000"

echo [+] Launching React/Vite Frontend Interface...
start "CryptoTrace Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =======================================================
echo All services have been launched in separate windows!
echo - Frontend running at: http://localhost:5173
echo - Backend API running at: http://localhost:8000
echo =======================================================
echo You can safely close this launcher window.
timeout /t 5 >nul
