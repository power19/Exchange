Write-Host "Building Dairimar USDT Android APK..." -ForegroundColor Cyan
Write-Host ""

# Build the APK
& .\gradlew.bat assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! APK built successfully" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK location:" -ForegroundColor Yellow
    $apkPath = Join-Path $PSScriptRoot "app\build\outputs\apk\debug\app-debug.apk"
    Write-Host $apkPath -ForegroundColor White
    Write-Host ""

    if (Test-Path $apkPath) {
        $fileSize = (Get-Item $apkPath).Length / 1MB
        Write-Host "APK Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you have:" -ForegroundColor Yellow
    Write-Host "1. Android Studio installed"
    Write-Host "2. Java JDK installed"
    Write-Host "3. ANDROID_HOME environment variable set"
    Write-Host ""
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
