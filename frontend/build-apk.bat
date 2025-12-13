@echo off
echo Building Dairimar USDT Android APK...
echo.

cd android
call gradlew.bat assembleDebug

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! APK built successfully
    echo ========================================
    echo.
    echo APK location:
    echo %CD%\app\build\outputs\apk\debug\app-debug.apk
    echo.
    pause
) else (
    echo.
    echo ========================================
    echo ERROR: Build failed
    echo ========================================
    echo.
    echo Make sure you have:
    echo 1. Android Studio installed
    echo 2. Java JDK installed
    echo 3. ANDROID_HOME environment variable set
    echo.
    pause
)
