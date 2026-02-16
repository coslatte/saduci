FROM python:3.11-slim

WORKDIR /app

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
