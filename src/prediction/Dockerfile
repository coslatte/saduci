FROM python:3.13-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies first (layer caching)
COPY services/prediction/requirements.txt /app/services/prediction/requirements.txt
RUN pip install --no-cache-dir -r services/prediction/requirements.txt

# Copy shared modules
COPY shared/ /app/shared/

# Copy service files
COPY services/prediction/ /app/services/prediction/

# Copy trained platform model artifact
COPY research_files/new_workflow.joblib /app/research_files/new_workflow.joblib

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Expose port
EXPOSE 8002

# Run the application
CMD ["python", "services/prediction/main.py"]
