@echo off
REM Deploy a specific version of the USDT Exchange application
REM Usage: deploy-version.bat [version]
REM Examples:
REM   deploy-version.bat v1.0.0
REM   deploy-version.bat main
REM   deploy-version.bat (uses main by default)

setlocal enabledelayedexpansion

set VERSION=%1
if "%VERSION%"=="" set VERSION=main

set ENV_FILE=.env.%VERSION%

echo.
echo ============================================
echo   Deploying USDT Exchange - Version: %VERSION%
echo ============================================
echo.

REM Check if env file exists
if not exist "%ENV_FILE%" (
    echo WARNING: Environment file %ENV_FILE% not found
    echo Creating default environment file...

    (
        echo VERSION=%VERSION%
        echo GITHUB_USER=power19
        echo DB_PASSWORD=postgres123
        echo BACKEND_PORT=3000
        echo JWT_SECRET=change-this-in-production
        echo ADMIN_PASSWORD=admin123
        echo FRONTEND_PORT=80
        echo VITE_API_URL=http://localhost:3000/api
        echo CORS_ORIGINS=*
    ) > "%ENV_FILE%"

    echo Created %ENV_FILE% - Please update with your production values!
    echo.
)

REM Display configuration
echo Configuration:
echo   Version: %VERSION%
echo   Environment File: %ENV_FILE%
echo.

REM Stop existing containers
echo Stopping existing containers...
docker-compose -f docker-compose.versioned.yml --env-file "%ENV_FILE%" down

REM Fetch latest tags if git repo
if exist ".git" (
    if not "%VERSION%"=="main" (
        echo Fetching latest tags from GitHub...
        git fetch --tags
    )
)

REM Build and start containers
echo.
echo Building and starting containers for version %VERSION%...
docker-compose -f docker-compose.versioned.yml --env-file "%ENV_FILE%" build --no-cache
docker-compose -f docker-compose.versioned.yml --env-file "%ENV_FILE%" up -d

echo.
echo ============================================
echo   Deployment complete!
echo ============================================
echo.
echo Container status:
docker-compose -f docker-compose.versioned.yml --env-file "%ENV_FILE%" ps

echo.
echo View logs:
echo   docker-compose -f docker-compose.versioned.yml --env-file %ENV_FILE% logs -f
echo.

endlocal
