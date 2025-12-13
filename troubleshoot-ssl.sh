#!/bin/bash
# SSL Certificate Troubleshooting Script
# Run this on your VPS to diagnose SSL issues

echo "======================================"
echo "SSL Certificate Troubleshooting"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found"
    echo "Please run this script from /opt/usdt-exchange directory"
    exit 1
fi

# Check container status
echo "1. Checking Docker container status..."
echo "--------------------------------------"
docker-compose -f docker-compose.prod.yml ps
echo ""

# Check Let's Encrypt logs
echo "2. Checking Let's Encrypt logs (last 30 lines)..."
echo "--------------------------------------"
docker-compose -f docker-compose.prod.yml logs --tail=30 letsencrypt
echo ""

# Check nginx-proxy logs
echo "3. Checking nginx-proxy logs (last 20 lines)..."
echo "--------------------------------------"
docker-compose -f docker-compose.prod.yml logs --tail=20 nginx-proxy
echo ""

# Check if certificate files exist
echo "4. Checking for certificate files..."
echo "--------------------------------------"
if [ -d "./certs" ]; then
    echo "Certificate directory exists:"
    ls -la ./certs/
    echo ""

    # Check for specific domain certificates
    echo "Looking for powermental.fit certificates:"
    ls -la ./certs/ | grep powermental || echo "No powermental.fit certificates found"
else
    echo "❌ Certificate directory not found!"
fi
echo ""

# Check DNS resolution
echo "5. Checking DNS resolution..."
echo "--------------------------------------"
for domain in main.powermental.fit patty.powermental.fit dai.powermental.fit api.powermental.fit; do
    ip=$(dig +short $domain | tail -n1)
    if [ -z "$ip" ]; then
        echo "❌ $domain - NOT RESOLVED"
    else
        echo "✅ $domain -> $ip"
    fi
done
echo ""

# Check if ports 80 and 443 are accessible
echo "6. Checking if ports 80 and 443 are listening..."
echo "--------------------------------------"
netstat -tlnp | grep -E ':80 |:443 ' || echo "No listeners found"
echo ""

# Check environment variables
echo "7. Checking environment variables..."
echo "--------------------------------------"
if [ -f ".env.production" ]; then
    echo "LETSENCRYPT_EMAIL: $(grep LETSENCRYPT_EMAIL .env.production | cut -d= -f2)"
    echo "MAIN_DOMAIN: $(grep MAIN_DOMAIN .env.production | cut -d= -f2)"
    echo "API_DOMAIN: $(grep API_DOMAIN .env.production | cut -d= -f2)"
else
    echo "❌ .env.production not found!"
fi
echo ""

echo "======================================"
echo "Troubleshooting Complete"
echo "======================================"
echo ""
echo "Common Issues and Solutions:"
echo ""
echo "1. DNS not resolving:"
echo "   - Wait 15-60 minutes for DNS propagation"
echo "   - Verify A records point to this server's IP"
echo ""
echo "2. Let's Encrypt rate limit:"
echo "   - Check logs above for 'rate limit' errors"
echo "   - Wait 1 hour and try again"
echo ""
echo "3. Firewall blocking ports:"
echo "   - Ensure ports 80 and 443 are open"
echo "   - Run: sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"
echo ""
echo "4. Certificates not generating:"
echo "   - Restart letsencrypt container:"
echo "   - docker-compose -f docker-compose.prod.yml restart letsencrypt"
echo ""

# Quick fix suggestions
echo "Quick Fix Commands:"
echo "-------------------"
echo "Restart Let's Encrypt:"
echo "  docker-compose -f docker-compose.prod.yml restart letsencrypt"
echo ""
echo "Restart all services:"
echo "  docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "Force certificate renewal:"
echo "  docker-compose -f docker-compose.prod.yml exec letsencrypt /app/force_renew"
echo ""
