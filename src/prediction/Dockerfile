FROM python:3.13-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies first (layer caching)
COPY src/prediction/requirements.txt /app/src/prediction/requirements.txt
RUN pip install --no-cache-dir -r src/prediction/requirements.txt

# Copy application code
COPY src/ /app/src/

# Copy trained platform model artifact
COPY research_files/new_workflow.joblib /app/research_files/new_workflow.joblib

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Expose port
EXPOSE 8002

# Run the application
CMD ["python", "src/prediction/main.py"]
