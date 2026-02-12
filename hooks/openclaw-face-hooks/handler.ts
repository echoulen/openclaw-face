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
    console.error('[openclaw-face-hooks] R2_BUCKET not set, skipping upload');
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
    console.log(`[openclaw-face-hooks] Uploaded status (busy: ${payload.busy})`);
  } catch (err) {
    console.error(
      '[openclaw-face-hooks] Upload failed:',
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * OpenClaw HookHandler
 *
 * Listens for all command events:
 * - command:new → busy: true
 * - any other   → busy: false
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
  console.log(`[openclaw-face-hooks] Event received: type=${event.type}, action=${event.action}, sessionKey=${event.sessionKey}`);

  if (event.type !== 'command') {
    return;
  }

  const busy = event.action === 'new';

  const payload: StatusPayload = {
    busy,
    ts: event.timestamp.getTime(),
    sessionKey: event.sessionKey,
    source: event.context.commandSource,
  };

  // Await upload to ensure it completes before process exits (e.g. on /stop)
  await uploadStatus(payload);
};

export default handler;
