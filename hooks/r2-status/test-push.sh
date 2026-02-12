#!/bin/bash
# OpenClaw r2-status Hook Test Script
# This script simulates OpenClaw events to test the hook's push functionality.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_DIR="$SCRIPT_DIR"

echo "=== OpenClaw r2-status Hook Test ==="
echo "Hook directory: $HOOK_DIR"
echo ""

# Check if required environment variables are set
if [ -z "$R2_ACCESS_KEY_ID" ] || [ -z "$R2_SECRET_ACCESS_KEY" ] || [ -z "$R2_ENDPOINT" ] || [ -z "$R2_BUCKET" ]; then
    echo "Warning: Some R2 environment variables are not set."
    echo "Make sure to set:"
    echo "  - R2_ACCESS_KEY_ID"
    echo "  - R2_SECRET_ACCESS_KEY"
    echo "  - R2_ENDPOINT"
    echo "  - R2_BUCKET"
    echo ""
    echo "You can create a .env file from .env.example:"
    echo "  cp .env.example .env"
    echo "  # Edit .env with your credentials"
    echo ""
    echo "Continuing with test anyway (will fail if R2 is not configured)..."
    echo ""
fi

# Step 1: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "[1/3] Installing dependencies..."
    cd "$HOOK_DIR"
    pnpm install
fi

# Step 2: Compile TypeScript
echo "[2/3] Compiling TypeScript..."
cd "$HOOK_DIR"
npx tsc

# Step 3: Run test script
echo "[3/3] Running push tests..."
cd "$HOOK_DIR"

# Create a simple test script that simulates model_call and complete events
node -e "
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// Load environment variables from .env file if it exists
require('dotenv').config({ path: path.join('$HOOK_DIR', '.env') });

const config = {
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://[account-id].r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'your_access_key',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'your_secret_key',
  },
};

const bucket = process.env.R2_BUCKET || 'openclaw-status-test';
const client = new S3Client(config);

async function testPush(status) {
  const payload = JSON.stringify({
    ...status,
    ts: Date.now(),
  });

  console.log('Pushing status:', payload);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: 'status.json',
    Body: payload,
    ContentType: 'application/json',
  });

  try {
    await client.send(command);
    console.log('✓ Successfully pushed status to R2');
    return true;
  } catch (error) {
    console.error('✗ Failed to push status:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('--- Test 1: Simulating model_call event (busy: true) ---');
  const test1 = await testPush({ busy: true, model: 'claude-3-5-sonnet', taskId: 'test-task-001' });
  
  // Wait a moment
  await new Promise(r => setTimeout(r, 10000));
  
  console.log('');
  console.log('--- Test 2: Simulating complete event (busy: false) ---');
  const test2 = await testPush({ busy: false, model: 'claude-3-5-sonnet', taskId: 'test-task-001' });
  
  console.log('');
  console.log('=== Test Results ===');
  console.log('model_call push:', test1 ? 'PASSED' : 'FAILED');
  console.log('complete push:', test2 ? 'PASSED' : 'FAILED');
  
  if (test1 && test2) {
    console.log('');
    console.log('All tests passed! Hook is working correctly.');
    process.exit(0);
  } else {
    console.log('');
    console.log('Some tests failed. Check your R2 configuration.');
    process.exit(1);
  }
}

runTests();
"

echo ""
echo "=== Test Complete ==="