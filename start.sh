#!/bin/bash
# Quick start script for sadeci-core

echo "🚀 Starting SADECI-Core Microservices..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo ""
echo "⬆️  Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo ""
echo "🏥 Health Check:"
echo ""

check_health() {
    local service=$1
    local port=$2
    if curl -f -s http://localhost:$port/health > /dev/null; then
        echo "✅ $service is healthy"
    else
        echo "⚠️  $service is not responding yet"
    fi
}

check_health "API Gateway" 8000
check_health "Patient Service" 8001
check_health "Prediction Service" 8002
check_health "Simulation Service" 8003

echo ""
echo "📚 API Documentation:"
echo "   - API Gateway: http://localhost:8000/docs"
echo "   - Patient Service: http://localhost:8001/docs"
echo "   - Prediction Service: http://localhost:8002/docs"
echo "   - Simulation Service: http://localhost:8003/docs"
echo ""
echo "🎉 SADECI-Core is running!"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
