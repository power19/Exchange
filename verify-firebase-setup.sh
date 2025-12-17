#!/bin/bash

# Firebase Push Notifications Setup Verification Script
# This script checks if all Firebase components are properly configured

set -e

echo "🔍 Firebase Push Notifications Setup Verification"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: @capacitor/push-notifications package
echo "📦 Checking Capacitor Push Notifications package..."
if grep -q '"@capacitor/push-notifications"' frontend/package.json; then
    echo -e "${GREEN}✅ @capacitor/push-notifications found in package.json${NC}"
else
    echo -e "${RED}❌ @capacitor/push-notifications NOT found in package.json${NC}"
    echo "   → Run: cd frontend && npm install @capacitor/push-notifications"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 2: google-services.json for Android
echo "📱 Checking google-services.json (Android app)..."
GOOGLE_SERVICES_LOCATIONS=(
    "frontend/android/app/google-services.json"
)

FOUND_GOOGLE_SERVICES=false
for location in "${GOOGLE_SERVICES_LOCATIONS[@]}"; do
    if [ -f "$location" ]; then
        echo -e "${GREEN}✅ Found: $location${NC}"

        # Validate JSON
        if jq empty "$location" 2>/dev/null; then
            echo "   → JSON is valid"

            # Check package name
            PACKAGE_NAMES=$(jq -r '.client[0].client_info.android_client_info.package_name' "$location" 2>/dev/null)
            echo "   → Package name: $PACKAGE_NAMES"

            # Verify it matches one of our app IDs
            if [[ "$PACKAGE_NAMES" =~ "com.usdt" ]]; then
                echo -e "   ${GREEN}→ Package name matches app ID${NC}"
            else
                echo -e "   ${YELLOW}⚠️  Package name might not match app ID (com.usdt.*)${NC}"
                WARNINGS=$((WARNINGS + 1))
            fi
        else
            echo -e "   ${RED}❌ Invalid JSON format${NC}"
            ERRORS=$((ERRORS + 1))
        fi

        FOUND_GOOGLE_SERVICES=true
    fi
done

if [ "$FOUND_GOOGLE_SERVICES" = false ]; then
    echo -e "${RED}❌ google-services.json NOT found${NC}"
    echo ""
    echo "   📥 Download from Firebase Console:"
    echo "   1. Go to https://console.firebase.google.com"
    echo "   2. Select your project"
    echo "   3. Click ⚙️ → Project settings"
    echo "   4. Scroll to 'Your apps' → Android app"
    echo "   5. Click 'google-services.json' download button"
    echo "   6. Save to: frontend/android/app/google-services.json"
    echo ""
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 3: firebase-service-account.json (Backend)
echo "🔑 Checking firebase-service-account.json (Backend)..."
if [ -f "firebase-service-account.json" ]; then
    echo -e "${GREEN}✅ Found: firebase-service-account.json${NC}"

    # Validate JSON
    if jq empty "firebase-service-account.json" 2>/dev/null; then
        echo "   → JSON is valid"

        PROJECT_ID=$(jq -r '.project_id' "firebase-service-account.json" 2>/dev/null)
        echo "   → Project ID: $PROJECT_ID"
    else
        echo -e "   ${RED}❌ Invalid JSON format${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ firebase-service-account.json NOT found${NC}"
    echo ""
    echo "   📥 Download from Firebase Console:"
    echo "   1. Go to https://console.firebase.google.com"
    echo "   2. Select your project"
    echo "   3. Click ⚙️ → Project settings → Service accounts"
    echo "   4. Click 'Generate new private key'"
    echo "   5. Save as: firebase-service-account.json (project root)"
    echo ""
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: Android build.gradle Firebase dependencies
echo "🔧 Checking Android Firebase dependencies..."
if grep -q "com.google.firebase:firebase-messaging" frontend/android/app/build.gradle; then
    echo -e "${GREEN}✅ Firebase Messaging dependency found in build.gradle${NC}"
else
    echo -e "${RED}❌ Firebase Messaging dependency NOT found${NC}"
    echo "   → Add to frontend/android/app/build.gradle:"
    echo "     implementation platform('com.google.firebase:firebase-bom:33.7.0')"
    echo "     implementation 'com.google.firebase:firebase-messaging'"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 5: google-services plugin
echo "🔌 Checking google-services plugin..."
if grep -q "com.google.gms:google-services" frontend/android/build.gradle; then
    echo -e "${GREEN}✅ google-services plugin found in build.gradle${NC}"
else
    echo -e "${YELLOW}⚠️  google-services plugin might not be configured${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 6: Docker compose configuration
echo "🐳 Checking Docker Compose configuration..."
if grep -q "GOOGLE_APPLICATION_CREDENTIALS" docker-compose.yml; then
    echo -e "${GREEN}✅ GOOGLE_APPLICATION_CREDENTIALS configured in docker-compose.yml${NC}"

    if grep -q "firebase-service-account.json" docker-compose.yml; then
        echo -e "${GREEN}✅ Firebase service account volume mounted${NC}"
    else
        echo -e "${RED}❌ Firebase service account volume NOT mounted${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ GOOGLE_APPLICATION_CREDENTIALS not found in docker-compose.yml${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 7: Database schema
echo "💾 Checking database schema for device_tokens table..."
if grep -q "CREATE TABLE.*device_tokens" backend/src/database/schema.sql 2>/dev/null; then
    echo -e "${GREEN}✅ device_tokens table found in schema.sql${NC}"
else
    echo -e "${YELLOW}⚠️  device_tokens table might not be in schema${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 8: Frontend push notification service
echo "📲 Checking frontend push notification service..."
if [ -f "frontend/src/services/pushNotificationService.ts" ]; then
    echo -e "${GREEN}✅ Frontend push notification service exists${NC}"

    # Check if it imports PushNotifications
    if grep -q "@capacitor/push-notifications" frontend/src/services/pushNotificationService.ts; then
        echo -e "${GREEN}✅ Imports @capacitor/push-notifications${NC}"
    else
        echo -e "${YELLOW}⚠️  Might not import @capacitor/push-notifications correctly${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ Frontend push notification service NOT found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 9: Backend push notification service
echo "📡 Checking backend push notification service..."
if [ -f "backend/src/services/pushNotificationService.ts" ]; then
    echo -e "${GREEN}✅ Backend push notification service exists${NC}"

    if grep -q "firebase-admin" backend/src/services/pushNotificationService.ts; then
        echo -e "${GREEN}✅ Imports firebase-admin${NC}"
    else
        echo -e "${RED}❌ Does not import firebase-admin${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ Backend push notification service NOT found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "=================================================="
echo "📊 Verification Summary"
echo "=================================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Firebase is properly configured.${NC}"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Install dependencies: cd frontend && npm install"
    echo "   2. Sync Capacitor: npx cap sync android"
    echo "   3. Open in Android Studio: npx cap open android"
    echo "   4. Check FIREBASE_DEBUG_GUIDE.md for testing steps"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Configuration has ${WARNINGS} warning(s) but should work${NC}"
else
    echo -e "${RED}❌ Found ${ERRORS} error(s) and ${WARNINGS} warning(s)${NC}"
    echo ""
    echo "🔧 Fix the errors above before proceeding"
fi

echo ""
exit $ERRORS
