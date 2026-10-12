# ==============================================================================
# SmartDC-Energy — FastAPI ML Inference Microservice Dockerfile
# Self-healing container: auto-generates models if missing on clone
# ==============================================================================
FROM python:3.10-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MODELS_DIR=/app/ml-pipeline/models \
    RESULTS_DIR=/app/ml-pipeline/results

# Install Python dependencies first for optimal Docker layer caching
COPY ml-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy service source code
COPY ml-service/ ./

# Copy model generation script and processed feature dataset
COPY setup_models.py /app/setup_models.py
COPY ml-pipeline/data/processed/ /app/ml-pipeline/data/processed/
COPY ml-pipeline/results/ /app/ml-pipeline/results/

# Copy models folder (contains .gitkeep; models generated on startup if missing)
COPY ml-pipeline/models/ /app/ml-pipeline/models/

# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=20s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/')" || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
