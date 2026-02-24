/**
 * Test script for Cost Tracker Hook
 * Simulates message events to verify cost calculation functionality.
 * Requires R2 environment variables to be set (or .env file).
 *
 * Usage: pnpm test:push
 */

import { config } from 'dotenv';
import { uploadCost } from './handler.js';

config();

// Mock cost payload for testing
const mockCostPayload = {
  timestamp: new Date().toISOString(),
  sessionKey: 'agent:main:main',
  totalCost: 0.0159,
  models: {
    'claude-sonnet-4-5': {
      cost: 0.0159,
      inputTokens: 100,
      outputTokens: 500,
      cacheReadTokens: 27000,
      cacheWriteTokens: 0,
      messageCount: 1
    }
  },
  messageCount: 1,
  lastMessageTime: new Date().toISOString()
};

async function testCostUpload() {
  console.log('[test] Testing cost upload to R2...');
  console.log('[test] Payload:', JSON.stringify(mockCostPayload, null, 2));
  
  try {
    await uploadCost(mockCostPayload);
    console.log('[test] ✓ Cost upload successful');
  } catch (error) {
    console.error('[test] ✗ Cost upload failed:', error);
    process.exit(1);
  }
}

// Check if required environment variables are set
function checkEnvVars() {
  const required = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_BUCKET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('[test] Missing environment variables:', missing.join(', '));
    console.error('[test] Please set them in a .env file or environment');
    process.exit(1);
  }
}

async function main() {
  console.log('[test] OpenClaw Face Cost Tracker - Test');
  console.log('[test] ================================\n');
  
  checkEnvVars();
  await testCostUpload();
  
  console.log('\n[test] All tests passed!');
}

main().catch(console.error);
