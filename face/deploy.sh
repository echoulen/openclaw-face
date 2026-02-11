#!/bin/bash
# OpenClaw Face Deployment Script
# This script builds the Face application and deploys it to GitHub Pages (gh-pages branch).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FACE_ROOT="$SCRIPT_DIR"
BUILD_DIR="$FACE_ROOT/dist"
TEMP_DIR=$(mktemp -d)

echo "=== OpenClaw Face Deployment ==="
echo "Face directory: $FACE_ROOT"
echo ""

# Step 1: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "[1/5] Installing dependencies..."
    cd "$FACE_ROOT"
    pnpm install
fi

# Step 2: Build the application
echo "[2/5] Building Face application..."
cd "$FACE_ROOT"
pnpm build

# Step 3: Verify build output
if [ ! -d "$BUILD_DIR" ]; then
    echo "Error: Build directory not found at $BUILD_DIR"
    exit 1
fi
echo "Build output verified: $BUILD_DIR"

# Step 4: Prepare for gh-pages deployment
echo "[3/5] Preparing gh-pages deployment..."
cd "$TEMP_DIR"
git init
git config user.name "${GIT_USER:-Deploy Bot}"
git config user.email "${GIT_EMAIL:-deploy@example.com}"

# Step 5: Deploy to gh-pages
echo "[4/5] Deploying to gh-pages..."
echo "Checking out to 'gh-pages' branch..."
git checkout -b gh-pages

# Clean existing content
rm -rf .gitignore
git rm -rf . 2>/dev/null || true

# Copy new build
cp -r "$FACE_ROOT/dist"/* .
git add .

# Commit and push
echo "Committing changes..."
git commit -m "Deploy Face: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

echo "[5/5] Pushing to remote..."
REMOTE_URL="${GIT_REMOTE_URL:-origin}"
git push -f "$REMOTE_URL" gh-pages

# Cleanup
cd "$FACE_DIR"
rm -rf "$TEMP_DIR"

echo ""
echo "=== Deployment Complete ==="
echo "Face application deployed to GitHub Pages (gh-pages branch)"
echo ""
echo "Note: GitHub Pages may take 1-2 minutes to update."
echo "If this is the first deployment, configure GitHub Pages in your repository settings:"
echo "  1. Go to Repository Settings > Pages"
echo "  2. Source: Deploy from a branch"
echo "  3. Branch: gh-pages / (root)"
echo "  4. Click Save"