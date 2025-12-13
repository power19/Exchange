#!/bin/bash

# USDT Exchange VPS Deployment Script
# This script helps deploy the application to production

set -e  # Exit on error

echo "========================================="
echo "USDT Exchange Production Deployment"
echo "========================================="
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your configuration."
    echo "See .env.production.example for reference."
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Verify required environment variables
REQUIRED_VARS=("MAIN_DOMAIN" "PATTY_DOMAIN" "DAI_DOMAIN" "LETSENCRYPT_EMAIL" "DB_PASSWORD" "JWT_SECRET" "ADMIN_PASSWORD")

echo "🔍 Checking environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env.production"
        exit 1
    fi
done
echo "✅ All required environment variables are set"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker first:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed"
    echo "Please install Docker Compose first:"
    echo "  sudo apt install docker-compose -y"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Show deployment configuration
echo "📋 Deployment Configuration:"
echo "   Main Domain:   $MAIN_DOMAIN"
echo "   Patty Domain:  $PATTY_DOMAIN"
echo "   Dai Domain:    $DAI_DOMAIN"
echo "   Email:         $LETSENCRYPT_EMAIL"
echo ""

# Confirm deployment
read -p "Do you want to proceed with deployment? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "🚀 Starting deployment..."
echo ""

# Stop existing containers if any
echo "📦 Stopping existing containers (if any)..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check container status
echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "🔍 To monitor logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🌐 Your dashboards will be available at:"
echo "   https://$MAIN_DOMAIN (Main Dashboard)"
echo "   https://$PATTY_DOMAIN (Patty's Dashboard)"
echo "   https://$DAI_DOMAIN (Dairimar's Dashboard)"
echo ""
echo "⏰ SSL certificates may take 2-5 minutes to generate."
echo "   You can check progress with:"
echo "   docker-compose -f docker-compose.prod.yml logs -f letsencrypt"
echo ""
echo "========================================="
echo "Deployment Complete! 🎉"
echo "========================================="
