# Deployment Guide

This guide covers deploying SADECI-Core in different environments.

## Table of Contents

- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Security Hardening](#security-hardening)
- [Monitoring](#monitoring)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

## Local Development

### Prerequisites

- Docker 20.10+ and Docker Compose
- 4GB+ RAM available for Docker
- 10GB+ free disk space

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/coslatte/sadeci-core.git
   cd sadeci-core
   ```

2. **Run the quick start script**
   ```bash
   ./start.sh
   ```

3. **Access the services**
   - API Gateway: http://localhost:8000/docs
   - Patient Service: http://localhost:8001/docs
   - Prediction Service: http://localhost:8002/docs
   - Simulation Service: http://localhost:8003/docs

### Manual Start

```bash
# Copy environment file
cp .env.example .env

# Build and start services
docker compose up --build

# Run in detached mode
docker compose up -d
```

## Production Deployment

### Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose installed
- Nginx or similar reverse proxy
- SSL certificate
- Domain name

### Step 1: Server Setup

1. **Update system**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Install Docker Compose**
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

### Step 2: Application Setup

1. **Clone repository**
   ```bash
   cd /opt
   sudo git clone https://github.com/coslatte/sadeci-core.git
   cd sadeci-core
   ```

2. **Configure environment**
   ```bash
   sudo cp .env.example .env
   sudo nano .env
   ```

   Update these values:
   ```bash
   SECRET_KEY=generate-a-strong-random-key-here
   PATIENT_DB_PASSWORD=strong-password-1
   PREDICTION_DB_PASSWORD=strong-password-2
   SIMULATION_DB_PASSWORD=strong-password-3
   LOG_LEVEL=INFO
   ```

3. **Configure service environment files**
   ```bash
   # Update each service's .env file
   for service in api-gateway patient prediction simulation; do
     sudo cp services/$service/.env.example services/$service/.env
     # Edit as needed
   done
   ```

### Step 3: Start Services

```bash
# Build images
sudo docker compose build

# Start services
sudo docker compose up -d

# Check status
sudo docker compose ps
```

### Step 4: Nginx Reverse Proxy

1. **Install Nginx**
   ```bash
   sudo apt install nginx -y
   ```

2. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/sadeci-core
   ```

   Add configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # Redirect to HTTPS
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name your-domain.com;

       ssl_certificate /etc/ssl/certs/your-cert.pem;
       ssl_certificate_key /etc/ssl/private/your-key.pem;

       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;

       # API Gateway
       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Direct service access (optional, for debugging)
       location /patient/ {
           proxy_pass http://localhost:8001/;
       }

       location /prediction/ {
           proxy_pass http://localhost:8002/;
       }

       location /simulation/ {
           proxy_pass http://localhost:8003/;
       }
   }
   ```

3. **Enable site and restart Nginx**
   ```bash
   sudo ln -s /etc/nginx/sites-available/sadeci-core /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Step 5: SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## Environment Configuration

### Required Environment Variables

#### Root .env
```bash
SECRET_KEY=<strong-random-key>
PATIENT_DB_PASSWORD=<secure-password>
PREDICTION_DB_PASSWORD=<secure-password>
SIMULATION_DB_PASSWORD=<secure-password>
LOG_LEVEL=INFO
```

#### Service-specific .env files

Each service has its own `.env` file. Update database URLs and passwords to match your configuration.

## Security Hardening

### 1. Change Default Credentials

```bash
# Generate strong JWT secret
openssl rand -hex 32

# Update in .env
SECRET_KEY=<generated-key>
```

### 2. Firewall Configuration

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Docker Security

```bash
# Run containers as non-root user
# Add to each Dockerfile:
USER nobody
```

### 4. Database Security

- Use strong passwords
- Restrict database access to service containers only
- Enable SSL for database connections in production
- Regular backups

### 5. CORS Configuration

Update `services/api-gateway/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

## Monitoring

### Health Checks

```bash
# Check all services
curl https://your-domain.com/health
curl https://your-domain.com:8001/health
curl https://your-domain.com:8002/health
curl https://your-domain.com:8003/health
```

### Logs

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f api-gateway
docker compose logs -f patient
docker compose logs -f prediction
docker compose logs -f simulation
```

### Resource Usage

```bash
# Check container stats
docker stats

# Check disk usage
docker system df
```

## Backup and Recovery

### Database Backup

```bash
# Backup all databases
docker exec patient-db pg_dump -U patient_user patient_db > patient_backup.sql
docker exec prediction-db pg_dump -U prediction_user prediction_db > prediction_backup.sql
docker exec simulation-db pg_dump -U simulation_user simulation_db > simulation_backup.sql
```

### Restore Database

```bash
# Restore database
docker exec -i patient-db psql -U patient_user patient_db < patient_backup.sql
```

### Automated Backups

Create a backup script:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/sadeci-core"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup databases
docker exec patient-db pg_dump -U patient_user patient_db | gzip > $BACKUP_DIR/patient_$DATE.sql.gz
docker exec prediction-db pg_dump -U prediction_user prediction_db | gzip > $BACKUP_DIR/prediction_$DATE.sql.gz
docker exec simulation-db pg_dump -U simulation_user simulation_db | gzip > $BACKUP_DIR/simulation_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /opt/sadeci-core/backup.sh
```

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker compose logs

# Check container status
docker compose ps

# Restart services
docker compose restart
```

### Database Connection Issues

```bash
# Check database health
docker compose exec patient-db pg_isready -U patient_user

# Check connection from service
docker compose exec patient nc -zv patient-db 5432
```

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :8000

# Kill process if needed
sudo kill -9 <PID>
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Increase Docker memory limit or add more RAM to server
```

### Permission Denied

```bash
# Fix file permissions
sudo chown -R $USER:$USER /opt/sadeci-core

# Fix volume permissions
docker compose down
docker volume rm sadeci-core_patient-db-data
docker compose up -d
```

## Updating the Application

```bash
# Pull latest changes
cd /opt/sadeci-core
git pull

# Rebuild and restart
docker compose down
docker compose build
docker compose up -d

# Check status
docker compose ps
```

## Scaling

### Horizontal Scaling

To run multiple instances of a service:

```yaml
# docker-compose.yml
services:
  patient:
    # ... existing config
    deploy:
      replicas: 3
```

Then use a load balancer (nginx) to distribute requests.

### Vertical Scaling

Allocate more resources to containers:

```yaml
services:
  patient:
    # ... existing config
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/coslatte/sadeci-core/issues
- Documentation: Check README.md and API_DOCUMENTATION.md
