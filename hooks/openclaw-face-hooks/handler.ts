/**
 * R2 Status Hook - Handler
 *
 * Pushes agent busy/idle status to Cloudflare R2 on command events.
 * Follows the OpenClaw HookHandler convention.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

config();

/**
 * Status payload uploaded to R2
 */
export interface StatusPayload {
  busy: boolean;
  ts: number;
  sessionKey?: string;
  source?: string;
}

/**
 * Lazily initialized S3 client (created on first use)
 */
let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });
  }
  return client;
}

/**
 * Uploads status payload to R2.
 * Does not throw — catches errors and logs them.
 */
export async function uploadStatus(payload: StatusPayload): Promise<void> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    console.error('[r2-status] R2_BUCKET not set, skipping upload');
    return;
  }

  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: 'status.json',
        Body: JSON.stringify(payload),
        ContentType: 'application/json',
        CacheControl: 'no-cache',
      })
    );
    console.log(`[r2-status] Uploaded status (busy: ${payload.busy})`);
  } catch (err) {
    console.error(
      '[r2-status] Upload failed:',
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * OpenClaw HookHandler
 *
 * Listens for command events:
 * - command:new   → busy: true
 * - command:stop  → busy: false
 * - command:reset → busy: false
 */
const handler = async (event: {
  type: string;
  action: string;
  sessionKey: string;
  timestamp: Date;
  messages: string[];
  context: {
    commandSource?: string;
    senderId?: string;
    [key: string]: unknown;
  };
}): Promise<void> => {
  if (event.type !== 'command') {
    return;
  }

  let busy: boolean;
  switch (event.action) {
    case 'new':
      busy = true;
      break;
    case 'stop':
    case 'reset':
      busy = false;
      break;
    default:
      return;
  }

  const payload: StatusPayload = {
    busy,
    ts: event.timestamp.getTime(),
    sessionKey: event.sessionKey,
    source: event.context.commandSource,
  };

  // Fire and forget — don't block command processing
  void uploadStatus(payload);
};

export default handler;
