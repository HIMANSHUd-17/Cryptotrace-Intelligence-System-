# Use official lightweight Python 3.10 slim image
FROM python:3.10-slim

# Set environment variables for offline execution and unbuffered logging
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install system build essentials & curl for health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code, models, and SQLite database
COPY . /app/

# Expose backend port
EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start Uvicorn web server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
