FROM python:3.13-slim

WORKDIR /app

# Install curl for health checks and PostgreSQL development libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies first (layer caching)
COPY src/api-gateway/requirements.txt /app/src/api-gateway/requirements.txt
RUN pip install --no-cache-dir -r src/api-gateway/requirements.txt

# Copy application code
COPY src/ /app/src/

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "src/api-gateway/main.py"]
