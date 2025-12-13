@echo off
echo ============================================
echo Building Patty USDT APK
echo ============================================
echo.

REM Set Java Home to Android Studio's JBR
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo JAVA_HOME set to: %JAVA_HOME%
echo.

REM Navigate to Android project
cd frontend\android

echo Running Gradle assembleDebug...
echo.

call gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo ✅ BUILD SUCCESSFUL!
    echo ============================================
    echo.
    echo APK Location:
    echo %CD%\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Opening APK folder...
    explorer "%CD%\app\build\outputs\apk\debug"
) else (
    echo.
    echo ============================================
    echo ❌ BUILD FAILED!
    echo ============================================
    echo.
    echo Please check the error messages above.
)

pause
