#!/bin/bash
# OpenClaw r2-status Hook Deployment Script
# This script compiles the TypeScript hook and copies it to the OpenClaw hooks directory.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_NAME="r2-status"
OPENCLAW_ROOT="${OPENCLAW_ROOT:-$(dirname $(dirname $(dirname "$SCRIPT_DIR")))}"
OPENCLAW_HOOKS_DIR="$OPENCLAW_ROOT/.openclaw/hooks"

echo "=== OpenClaw r2-status Hook Deployment ==="
echo "Hook directory: $SCRIPT_DIR"
echo "OpenClaw root: $OPENCLAW_ROOT"
echo ""

# Step 1: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "[1/4] Installing dependencies..."
    pnpm install
fi

# Step 2: Compile TypeScript
echo "[2/4] Compiling TypeScript..."
cd "$SCRIPT_DIR"
npx tsc

# Step 3: Create OpenClaw hooks directory if it doesn't exist
echo "[3/4] Setting up OpenClaw hooks directory..."
mkdir -p "$OPENCLAW_HOOKS_DIR"

# Step 4: Copy compiled files to OpenClaw hooks directory
echo "[4/4] Deploying hook to OpenClaw..."
rm -rf "$OPENCLAW_HOOKS_DIR/$HOOK_NAME"
cp -r "$SCRIPT_DIR" "$OPENCLAW_HOOKS_DIR/$HOOK_NAME"

# Remove development files from deployment
rm -rf "$OPENCLAW_HOOKS_DIR/$HOOK_NAME/node_modules"
rm -f "$OPENCLAW_HOOKS_DIR/$HOOK_NAME/package.json"
rm -f "$OPENCLAW_HOOKS_DIR/$HOOK_NAME/tsconfig.json"
rm -rf "$OPENCLAW_HOOKS_DIR/$HOOK_NAME/__tests__"

echo ""
echo "=== Deployment Complete ==="
echo "Hook deployed to: $OPENCLAW_HOOKS_DIR/$HOOK_NAME"
echo ""
echo "To enable the hook, run:"
echo "  cd $OPENCLAW_ROOT && openclaw hooks enable r2-status"
echo ""
echo "Make sure to set the required environment variables:"
echo "  - R2_ACCESS_KEY_ID"
echo "  - R2_SECRET_ACCESS_KEY"
echo "  - R2_ENDPOINT"
echo "  - R2_BUCKET"