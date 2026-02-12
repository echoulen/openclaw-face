/**
 * R2 Status Hook - Integration Test
 *
 * Simulates command events to verify R2 push functionality.
 * Requires R2 environment variables to be set (or .env file).
 *
 * Usage: pnpm test:push
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '.env') });

import { uploadStatus, StatusPayload } from './handler';

const REQUIRED_VARS = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_BUCKET'] as const;

const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
  console.warn('Set them or create a .env file. Continuing anyway...\n');
}

async function testPush(label: string, payload: StatusPayload): Promise<boolean> {
  console.log(`--- ${label} ---`);
  try {
    await uploadStatus(payload);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('=== R2 Status Push Integration Test ===\n');

  const test1 = await testPush('Test 1: command:new (busy: true)', {
    busy: true,
    ts: Date.now(),
    sessionKey: 'agent:main:main',
    source: 'test',
  });

  await new Promise((r) => setTimeout(r, 2000));

  const test2 = await testPush('Test 2: command:stop (busy: false)', {
    busy: false,
    ts: Date.now(),
    sessionKey: 'agent:main:main',
    source: 'test',
  });

  console.log('\n=== Results ===');
  console.log('command:new  push:', test1 ? 'PASSED' : 'FAILED');
  console.log('command:stop push:', test2 ? 'PASSED' : 'FAILED');

  process.exit(test1 && test2 ? 0 : 1);
}

main();
