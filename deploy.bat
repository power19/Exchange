@echo off
echo ========================================
echo Building USDT Exchange System v2.0
echo ========================================
echo.

echo Step 1: Building Backend Docker Image
echo --------------------------------------
cd backend
docker build -t power1984/powermental-app:2.0 .
if %errorlevel% neq 0 (
    echo Backend build failed!
    exit /b 1
)
docker tag power1984/powermental-app:2.0 power1984/powermental-app:latest
cd ..

echo.
echo Step 2: Building Frontend
echo --------------------------------------
cd frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed!
    exit /b 1
)
cd ..

echo.
echo Step 3: Pushing Backend Image to Docker Hub
echo --------------------------------------
echo Please login to Docker Hub if prompted:
docker login
docker push power1984/powermental-app:2.0
docker push power1984/powermental-app:latest
if %errorlevel% neq 0 (
    echo Push failed!
    exit /b 1
)

echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Frontend dist files are in: frontend\dist\
echo Backend images pushed to Docker Hub:
echo   - power1984/powermental-app:2.0
echo   - power1984/powermental-app:latest
echo.
echo Next steps:
echo 1. Copy frontend to VPS: scp -r frontend\dist\* admin@powermental:~/usdt-exchange/frontend-dist/
echo 2. SSH to VPS: ssh admin@powermental
echo 3. Pull image: docker pull power1984/powermental-app:latest
echo 4. Deploy: cd ~/usdt-exchange ^&^& docker-compose down ^&^& docker-compose up -d
echo 5. Check logs: docker-compose logs -f backend
echo.
pause
