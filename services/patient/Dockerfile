FROM python:3.13-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies first (layer caching)
COPY services/patient/requirements.txt /app/services/patient/requirements.txt
RUN pip install --no-cache-dir -r services/patient/requirements.txt

# Copy shared modules
COPY shared/ /app/shared/

# Copy service files
COPY services/patient/ /app/services/patient/

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Expose port
EXPOSE 8001

# Run the application
CMD ["python", "services/patient/main.py"]
