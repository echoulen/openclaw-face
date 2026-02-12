/**
 * R2 Status Hook - Integration Test
 *
 * Simulates model_call and complete events to verify R2 push functionality.
 * Requires R2 environment variables to be set (or .env file).
 *
 * Usage: pnpm test:push
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import { resolve } from 'path';
import { StatusPayload } from './types';

config({ path: resolve(__dirname, '.env') });

const REQUIRED_VARS = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_BUCKET'] as const;

const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
  console.warn('Set them or create a .env file. Continuing anyway...\n');
}

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

const bucket = process.env.R2_BUCKET ?? 'openclaw-status-test';

async function pushStatus(payload: StatusPayload): Promise<boolean> {
  const body = JSON.stringify(payload);
  console.log('Pushing status:', body);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: 'status.json',
        Body: body,
        ContentType: 'application/json',
      })
    );
    console.log('✓ Successfully pushed status to R2');
    return true;
  } catch (error) {
    console.error('✗ Failed to push status:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  console.log('=== R2 Status Push Integration Test ===\n');

  console.log('--- Test 1: model_call event (busy: true) ---');
  const test1 = await pushStatus({
    busy: true,
    model: 'claude-3-5-sonnet',
    ts: Date.now(),
    taskId: 'test-task-001',
  });

  await new Promise((r) => setTimeout(r, 2000));

  console.log('\n--- Test 2: complete event (busy: false) ---');
  const test2 = await pushStatus({
    busy: false,
    model: 'claude-3-5-sonnet',
    ts: Date.now(),
    taskId: 'test-task-001',
  });

  console.log('\n=== Results ===');
  console.log('model_call push:', test1 ? 'PASSED' : 'FAILED');
  console.log('complete push:  ', test2 ? 'PASSED' : 'FAILED');

  process.exit(test1 && test2 ? 0 : 1);
}

main();
