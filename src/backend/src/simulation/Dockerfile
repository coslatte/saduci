FROM python:3.13-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies first (layer caching)
COPY src/simulation/requirements.txt /app/src/simulation/requirements.txt
RUN pip install --no-cache-dir -r src/simulation/requirements.txt

# Copy application code
COPY src/ /app/src/

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Expose port
EXPOSE 8003

# Run the application
CMD ["python", "src/simulation/main.py"]
