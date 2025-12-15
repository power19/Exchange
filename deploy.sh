#!/bin/bash
set -e

echo "🚀 Building and deploying USDT Exchange System"
echo "================================================"

# Configuration
DOCKER_USERNAME="power1984"
BACKEND_IMAGE="$DOCKER_USERNAME/powermental-app"
VERSION=${1:-latest}

echo ""
echo "📦 Step 1: Building Backend Docker Image"
echo "----------------------------------------"
cd backend
docker build -t $BACKEND_IMAGE:$VERSION .
docker tag $BACKEND_IMAGE:$VERSION $BACKEND_IMAGE:latest

echo ""
echo "📦 Step 2: Building Frontend"
echo "----------------------------------------"
cd ../frontend
npm install
npm run build

echo ""
echo "🔐 Step 3: Pushing Backend Image to Docker Hub"
echo "----------------------------------------"
echo "Please login to Docker Hub if not already logged in:"
docker login
docker push $BACKEND_IMAGE:$VERSION
docker push $BACKEND_IMAGE:latest

echo ""
echo "✅ Build Complete!"
echo "=================="
echo ""
echo "Frontend dist files are in: frontend/dist/"
echo "Backend image pushed to: $BACKEND_IMAGE:$VERSION"
echo ""
echo "Next steps:"
echo "1. Copy frontend/dist/* to VPS: scp -r frontend/dist/* admin@powermental:~/usdt-exchange/frontend-dist/"
echo "2. SSH to VPS: ssh admin@powermental"
echo "3. Pull new backend image: docker pull $BACKEND_IMAGE:latest"
echo "4. Restart containers: cd ~/usdt-exchange && docker-compose up -d --force-recreate backend"
echo "5. Check logs: docker-compose logs -f backend"
echo ""
