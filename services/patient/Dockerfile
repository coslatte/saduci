FROM python:3.13-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy shared modules
COPY shared/ /app/shared/

# Copy service files
COPY services/patient/ /app/services/patient/

# Install dependencies
RUN pip install --no-cache-dir -r services/patient/requirements.txt

# Expose port
EXPOSE 8001

# Run the application
CMD ["python", "services/patient/main.py"]
