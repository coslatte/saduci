FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY src/patient/requirements.txt /app/src/patient/requirements.txt
RUN pip install --no-cache-dir -r src/patient/requirements.txt

COPY src/ /app/src/

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

EXPOSE 8001

CMD ["python", "src/patient/main.py"]
