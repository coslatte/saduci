FROM python:3.11-slim

WORKDIR /app

# Copy shared modules
COPY shared/ /app/shared/

# Copy service files
COPY services/prediction/ /app/services/prediction/

# Install dependencies
RUN pip install --no-cache-dir -r services/prediction/requirements.txt

# Expose port
EXPOSE 8002

# Run the application
CMD ["python", "services/prediction/main.py"]
