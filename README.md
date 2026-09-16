# CryptoTrace Forensic Intelligence

CryptoTrace is a comprehensive Bitcoin forensic intelligence platform. This project consists of a Python FastAPI machine learning backend and a React (Vite) frontend.

## Prerequisites

- **Python 3.10+** (for manual backend viewing/running)
- **Node.js 18+** (for manual frontend viewing/running)
- **Docker** (Optional, for containerized runner)

## Quick Start (Without Docker)

We provide convenient scripts to run both the frontend and backend simultaneously without manually opening multiple terminals.

### Windows
Double click the `start-CryptoTrace.bat` file or run it in your terminal:
```bash
.\start-CryptoTrace.bat
```

### Linux / macOS
Make the startup script executable and run it:
```bash
chmod +x start_linux.sh
./start_linux.sh
```

## Manual Setup

If you prefer to run the components manually, follow these steps:

### 1. Backend Setup
The backend requires Python and it reads from `crypto_trace.db`.
```bash
cd backend
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```
The API UI will be available at http://localhost:8000/docs

### 2. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The web interface will be available at http://localhost:5173

## Docker Setup

To run the entire stack (backend + database volume mapping) using Docker Compose:

```bash
docker-compose up --build
```

Note: By default the frontend acts as its own dev server unless added to docker-compose. Please refer to frontend instructions if it isn't accessible.

## Architecture Highlights
- The backend utilizes SQLite (`crypto_trace.db`) for storing intelligence data. 
- Machine learning components integrate tools such as PyTorch, GraphSAGE, XGBoost, and Scikit-learn.
- The UI contains rich graphical visualizations of Bitcoin transaction networks.
