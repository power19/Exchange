#!/bin/bash
# Build and Push Docker Images to Docker Hub
# Usage: ./build-and-push.sh [docker-username] [tag]

set -e

# Load environment variables from .env.production
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | grep -v '^$' | xargs)
fi

# Get Docker username and tag from arguments or env
DOCKER_USERNAME=${1:-${DOCKER_USERNAME:-brianpower}}
IMAGE_TAG=${2:-${IMAGE_TAG:-latest}}

echo "======================================"
echo "Building and Pushing Docker Images"
echo "======================================"
echo "Docker Username: $DOCKER_USERNAME"
echo "Image Tag: $IMAGE_TAG"
echo "======================================"

# Check if logged in to Docker Hub
echo ""
echo "Checking Docker Hub login..."
if ! docker info | grep -q "Username"; then
    echo "⚠️  Not logged in to Docker Hub. Please login:"
    docker login
fi

# Build backend image
echo ""
echo "🔨 Building backend image..."
docker build -t ${DOCKER_USERNAME}/usdt-exchange-backend:${IMAGE_TAG} ./backend

# Build frontend image
echo ""
echo "🔨 Building frontend image..."
docker build -t ${DOCKER_USERNAME}/usdt-exchange-frontend:${IMAGE_TAG} ./frontend

# Push backend image
echo ""
echo "📤 Pushing backend image to Docker Hub..."
docker push ${DOCKER_USERNAME}/usdt-exchange-backend:${IMAGE_TAG}

# Push frontend image
echo ""
echo "📤 Pushing frontend image to Docker Hub..."
docker push ${DOCKER_USERNAME}/usdt-exchange-frontend:${IMAGE_TAG}

echo ""
echo "======================================"
echo "✅ Successfully built and pushed images!"
echo "======================================"
echo "Backend: ${DOCKER_USERNAME}/usdt-exchange-backend:${IMAGE_TAG}"
echo "Frontend: ${DOCKER_USERNAME}/usdt-exchange-frontend:${IMAGE_TAG}"
echo "======================================"
echo ""
echo "📋 To deploy on your VPS, run:"
echo "docker-compose -f docker-compose.prod.yml --env-file .env.production pull"
echo "docker-compose -f docker-compose.prod.yml --env-file .env.production up -d"
echo ""
