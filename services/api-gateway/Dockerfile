FROM python:3.11-slim

WORKDIR /app

# Copy shared modules
COPY shared/ /app/shared/

# Copy service files
COPY services/api-gateway/ /app/services/api-gateway/

# Install dependencies
RUN pip install --no-cache-dir -r services/api-gateway/requirements.txt

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "services/api-gateway/main.py"]
