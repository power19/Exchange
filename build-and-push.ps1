# Build and Push Docker Images to Docker Hub (PowerShell)
# Usage: .\build-and-push.ps1 [docker-username] [tag]

param(
    [string]$DockerUsername = "brianpower",
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

# Load environment variables from .env.production if exists
if (Test-Path .env.production) {
    Get-Content .env.production | Where-Object { $_ -notmatch '^#' -and $_ -match '=' } | ForEach-Object {
        $key, $value = $_ -split '=', 2
        $key = $key.Trim()
        $value = $value.Trim()
        if ($key -eq "DOCKER_USERNAME" -and !$DockerUsername) { $DockerUsername = $value }
        if ($key -eq "IMAGE_TAG" -and !$ImageTag) { $ImageTag = $value }
    }
}

Write-Host "======================================"
Write-Host "Building and Pushing Docker Images"
Write-Host "======================================"
Write-Host "Docker Username: $DockerUsername"
Write-Host "Image Tag: $ImageTag"
Write-Host "======================================"

# Check if logged in to Docker Hub
Write-Host ""
Write-Host "Checking Docker Hub login..."
try {
    docker info | Select-String "Username" | Out-Null
} catch {
    Write-Host "⚠️  Not logged in to Docker Hub. Please login:" -ForegroundColor Yellow
    docker login
}

# Build backend image
Write-Host ""
Write-Host "🔨 Building backend image..." -ForegroundColor Cyan
docker build -t "${DockerUsername}/usdt-exchange-backend:${ImageTag}" ./backend

# Build frontend image
Write-Host ""
Write-Host "🔨 Building frontend image..." -ForegroundColor Cyan
docker build -t "${DockerUsername}/usdt-exchange-frontend:${ImageTag}" ./frontend

# Push backend image
Write-Host ""
Write-Host "📤 Pushing backend image to Docker Hub..." -ForegroundColor Cyan
docker push "${DockerUsername}/usdt-exchange-backend:${ImageTag}"

# Push frontend image
Write-Host ""
Write-Host "📤 Pushing frontend image to Docker Hub..." -ForegroundColor Cyan
docker push "${DockerUsername}/usdt-exchange-frontend:${ImageTag}"

Write-Host ""
Write-Host "======================================"
Write-Host "✅ Successfully built and pushed images!" -ForegroundColor Green
Write-Host "======================================"
Write-Host "Backend: ${DockerUsername}/usdt-exchange-backend:${ImageTag}"
Write-Host "Frontend: ${DockerUsername}/usdt-exchange-frontend:${ImageTag}"
Write-Host "======================================"
Write-Host ""
Write-Host "📋 To deploy on your VPS, run:"
Write-Host "docker-compose -f docker-compose.prod.yml --env-file .env.production pull"
Write-Host "docker-compose -f docker-compose.prod.yml --env-file .env.production up -d"
Write-Host ""
