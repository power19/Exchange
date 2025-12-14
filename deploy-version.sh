#!/bin/bash

# Deploy a specific version of the USDT Exchange application
# Usage: ./deploy-version.sh [version]
# Examples:
#   ./deploy-version.sh v1.0.0
#   ./deploy-version.sh main
#   ./deploy-version.sh (uses main by default)

set -e

VERSION=${1:-main}
ENV_FILE=".env.${VERSION}"

echo "🚀 Deploying USDT Exchange - Version: ${VERSION}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  Warning: Environment file $ENV_FILE not found"
    echo "Creating default environment file..."
    cat > "$ENV_FILE" <<EOF
VERSION=${VERSION}
GITHUB_USER=power19
DB_PASSWORD=postgres123
BACKEND_PORT=3000
JWT_SECRET=change-this-in-production
ADMIN_PASSWORD=admin123
FRONTEND_PORT=80
VITE_API_URL=http://localhost:3000/api
CORS_ORIGINS=*
EOF
    echo "✅ Created $ENV_FILE - Please update with your production values!"
fi

# Load environment variables
export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

echo "📋 Configuration:"
echo "   Version: ${VERSION}"
echo "   GitHub User: ${GITHUB_USER}"
echo "   Backend Port: ${BACKEND_PORT}"
echo "   Frontend Port: ${FRONTEND_PORT}"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.versioned.yml --env-file "$ENV_FILE" down

# Pull latest changes from GitHub (if deploying from local clone)
if [ "$VERSION" != "main" ] && [ -d ".git" ]; then
    echo "📥 Fetching latest tags from GitHub..."
    git fetch --tags
fi

# Build and start containers
echo "🔨 Building and starting containers for version ${VERSION}..."
docker-compose -f docker-compose.versioned.yml --env-file "$ENV_FILE" build --no-cache
docker-compose -f docker-compose.versioned.yml --env-file "$ENV_FILE" up -d

echo ""
echo "✅ Deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Container status:"
docker-compose -f docker-compose.versioned.yml --env-file "$ENV_FILE" ps
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:${FRONTEND_PORT}"
echo "   Backend:  http://localhost:${BACKEND_PORT}"
echo ""
echo "📝 View logs:"
echo "   docker-compose -f docker-compose.versioned.yml --env-file $ENV_FILE logs -f"
echo ""
