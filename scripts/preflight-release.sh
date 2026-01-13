#!/bin/bash
# Pre-flight release validation script
# Tests build, signing, and notarization locally before triggering CI release

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Zoo Database - Pre-flight Release    ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env.release exists
ENV_FILE=".env.release"
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}Loading credentials from $ENV_FILE${NC}"
    set -a
    source "$ENV_FILE"
    set +a
else
    echo -e "${YELLOW}No $ENV_FILE found. Using environment variables.${NC}"
fi

# Required environment variables
REQUIRED_VARS=(
    "APPLE_CERTIFICATE"
    "APPLE_CERTIFICATE_PASSWORD"
    "APPLE_SIGNING_IDENTITY"
    "APPLE_ID"
    "APPLE_PASSWORD"
    "APPLE_TEAM_ID"
)

# Check for required variables
echo ""
echo -e "${BLUE}[1/6] Checking credentials...${NC}"
MISSING_VARS=()
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        MISSING_VARS+=("$VAR")
    else
        echo -e "  ${GREEN}✓${NC} $VAR is set"
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo ""
    echo -e "${RED}Missing required environment variables:${NC}"
    for VAR in "${MISSING_VARS[@]}"; do
        echo -e "  ${RED}✗${NC} $VAR"
    done
    echo ""
    echo -e "Create a ${YELLOW}.env.release${NC} file with these variables, or export them."
    echo -e "See ${YELLOW}.env.release.example${NC} for the template."
    exit 1
fi

# Parse arguments
VERSION=""
CREATE_TAG=false
SKIP_BUILD=false
TARGET="aarch64-apple-darwin"  # Default to current Mac architecture

while [[ $# -gt 0 ]]; do
    case $1 in
        --version|-v)
            VERSION="$2"
            shift 2
            ;;
        --tag|-t)
            CREATE_TAG=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --target)
            TARGET="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --version, -v <ver>  Version to release (e.g., 0.0.3)"
            echo "  --tag, -t            Create git tag after successful validation"
            echo "  --skip-build         Skip build, use existing DMG"
            echo "  --target <target>    Build target (default: aarch64-apple-darwin)"
            echo "  --help, -h           Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Detect architecture if not specified
if [ "$TARGET" = "auto" ]; then
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        TARGET="aarch64-apple-darwin"
    else
        TARGET="x86_64-apple-darwin"
    fi
fi

echo ""
echo -e "${BLUE}[2/6] Setting up keychain...${NC}"

# Create temporary keychain for signing
KEYCHAIN_PATH="$HOME/Library/Keychains/build.keychain-db"
KEYCHAIN_PASSWORD=$(openssl rand -base64 32)

# Remove existing build keychain if present
security delete-keychain "$KEYCHAIN_PATH" 2>/dev/null || true

# Create new keychain
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

# Decode and import certificate
echo "$APPLE_CERTIFICATE" | base64 --decode > /tmp/certificate.p12
security import /tmp/certificate.p12 -k "$KEYCHAIN_PATH" -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
rm /tmp/certificate.p12

# Set key partition list
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

# Add to search list
security list-keychains -d user -s "$KEYCHAIN_PATH" $(security list-keychains -d user | tr -d '"')

echo -e "  ${GREEN}✓${NC} Keychain configured"

# Cleanup function
cleanup() {
    echo ""
    echo -e "${BLUE}Cleaning up keychain...${NC}"
    security delete-keychain "$KEYCHAIN_PATH" 2>/dev/null || true
}
trap cleanup EXIT

if [ "$SKIP_BUILD" = false ]; then
    echo ""
    echo -e "${BLUE}[3/6] Building Tauri app...${NC}"
    echo -e "  Target: ${YELLOW}$TARGET${NC}"

    # Install dependencies
    bun install --frozen-lockfile

    # Sync version if specified
    if [ -n "$VERSION" ]; then
        echo -e "  Version: ${YELLOW}$VERSION${NC}"
        # Update version in package.json and tauri.conf.json
        bun run version:sync "$VERSION" 2>/dev/null || true
    fi

    # Build the app
    bun run tauri build --target "$TARGET"

    echo -e "  ${GREEN}✓${NC} Build complete"
else
    echo ""
    echo -e "${YELLOW}[3/6] Skipping build (--skip-build)${NC}"
fi

echo ""
echo -e "${BLUE}[4/6] Finding DMG...${NC}"

DMG_PATH=$(find src-tauri/target -name "*.dmg" -type f 2>/dev/null | head -1)

if [ -z "$DMG_PATH" ]; then
    echo -e "${RED}No DMG file found!${NC}"
    echo "Run without --skip-build to build first."
    exit 1
fi

DMG_NAME=$(basename "$DMG_PATH")
DMG_SIZE=$(du -h "$DMG_PATH" | cut -f1)

echo -e "  ${GREEN}✓${NC} Found: $DMG_NAME ($DMG_SIZE)"

echo ""
echo -e "${BLUE}[5/6] Submitting for notarization...${NC}"
echo -e "  ${YELLOW}This may take 2-10 minutes...${NC}"
echo ""

# Submit for notarization
xcrun notarytool submit "$DMG_PATH" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" \
    --wait \
    --verbose

NOTARIZE_STATUS=$?

if [ $NOTARIZE_STATUS -ne 0 ]; then
    echo ""
    echo -e "${RED}Notarization failed!${NC}"
    echo "Check the output above for details."
    exit 1
fi

echo ""
echo -e "  ${GREEN}✓${NC} Notarization successful!"

echo ""
echo -e "${BLUE}[6/6] Stapling ticket...${NC}"

xcrun stapler staple "$DMG_PATH"

echo -e "  ${GREEN}✓${NC} Ticket stapled"

# Verify
echo ""
echo -e "${BLUE}Verifying signature...${NC}"
spctl -a -vvv --type open --context context:primary-signature "$DMG_PATH" 2>&1 || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Pre-flight validation PASSED!        ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "The build is signed and notarized successfully."
echo -e "DMG location: ${YELLOW}$DMG_PATH${NC}"

if [ "$CREATE_TAG" = true ] && [ -n "$VERSION" ]; then
    echo ""
    echo -e "${BLUE}Creating git tag v$VERSION...${NC}"

    # Check if tag exists
    if git rev-parse "v$VERSION" >/dev/null 2>&1; then
        echo -e "${YELLOW}Tag v$VERSION already exists. Deleting...${NC}"
        git tag -d "v$VERSION"
        git push origin --delete "v$VERSION" 2>/dev/null || true
    fi

    git tag "v$VERSION"
    git push origin "v$VERSION"

    echo -e "${GREEN}✓${NC} Tag v$VERSION created and pushed!"
    echo ""
    echo -e "Release workflow triggered: ${YELLOW}https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions${NC}"
elif [ -n "$VERSION" ]; then
    echo ""
    echo -e "To trigger the release workflow, run:"
    echo -e "  ${YELLOW}git tag v$VERSION && git push origin v$VERSION${NC}"
fi
