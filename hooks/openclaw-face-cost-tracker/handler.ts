/**
 * Cost Tracker Hook - Handler
 *
 * Tracks AI costs by calculating token usage with delayed aggregation.
 * Follows the OpenClaw HookHandler convention.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { getPricing } from './pricing.js';

config();

/**
 * Cost payload structure
 */
export interface CostPayload {
  timestamp: string;
  sessionKey: string;
  totalCost: number;
  models: Record<string, {
    cost: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    messageCount: number;
  }>;
  messageCount: number;
  lastMessageTime: string;
}

/**
 * Session cost calculation result
 */
interface SessionCost {
  sessionId: string;
  totalCost: number;
  models: Record<string, {
    cost: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    messageCount: number;
  }>;
  messageCount: number;
  lastTimestamp: string;
}

/**
 * Lazily initialized S3 client
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
 * Uploads cost payload to R2.
 * Does not throw — catches errors and logs them.
 */
export async function uploadCost(payload: CostPayload): Promise<void> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) {
    console.error('[openclaw-face-cost-tracker] R2_BUCKET not set, skipping upload');
    return;
  }

  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: 'cost.json',
        Body: JSON.stringify(payload),
        ContentType: 'application/json',
        CacheControl: 'no-cache',
      })
    );
    console.log(`[openclaw-face-cost-tracker] Uploaded cost: $${payload.totalCost.toFixed(4)} for ${payload.messageCount} messages`);
  } catch (err) {
    console.error(
      '[openclaw-face-cost-tracker] Upload failed:',
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Calculate cost for a given token breakdown and model
 */
export function calculateCost(tokenBreakdown: {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}, model: string): { total: number; breakdown: Record<string, number> } {
  const pricing = getPricing()[model];
  if (!pricing) {
    console.error(`[openclaw-face-cost-tracker] No pricing found for model: ${model}`);
    return { total: 0, breakdown: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 } };
  }

  const inputCost = (tokenBreakdown.input / 1_000_000) * pricing.input;
  const outputCost = (tokenBreakdown.output / 1_000_000) * pricing.output;
  
  let cacheWriteCost = 0;
  let cacheReadCost = 0;

  if (pricing.cacheWrite && tokenBreakdown.cacheWrite > 0) {
    cacheWriteCost = (tokenBreakdown.cacheWrite / 1_000_000) * pricing.cacheWrite;
  }

  if (pricing.cacheRead && tokenBreakdown.cacheRead > 0) {
    cacheReadCost = (tokenBreakdown.cacheRead / 1_000_000) * pricing.cacheRead;
  }

  return {
    total: inputCost + outputCost + cacheWriteCost + cacheReadCost,
    breakdown: {
      input: inputCost,
      output: outputCost,
      cacheWrite: cacheWriteCost,
      cacheRead: cacheReadCost
    }
  };
}

/**
 * Parse a single JSONL file and extract usage data
 */
async function parseJsonlFile(filePath: string): Promise<SessionCost | null> {
  const sessionId = path.basename(filePath, '.jsonl');
  
  try {
    const fileStream = createReadStream(filePath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let totalCost = 0;
    let messageCount = 0;
    let lastTimestamp = '';
    const models: Record<string, {
      cost: number;
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheWriteTokens: number;
      messageCount: number;
    }> = {};

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line);

        // Process messages with usage data
        if (entry.type === 'message' && entry.message && entry.message.usage) {
          const usage = entry.message.usage;
          const model = entry.message.model || 'unknown';
          const timestamp = entry.timestamp || '';

          // Handle both OpenClaw and Claude Code formats
          const inputTokens = usage.input_tokens || usage.input || 0;
          const outputTokens = usage.output_tokens || usage.output || 0;
          const cacheWriteTokens = usage.cache_creation_input_tokens || usage.cacheWrite || 0;
          const cacheReadTokens = usage.cache_read_input_tokens || usage.cacheRead || 0;

          // Use OpenClaw's pre-calculated cost if available
          let msgCost = 0;
          if (usage.cost && usage.cost.total) {
            msgCost = usage.cost.total;
          } else {
            const costResult = calculateCost({
              input: inputTokens,
              output: outputTokens,
              cacheWrite: cacheWriteTokens,
              cacheRead: cacheReadTokens
            }, model);
            msgCost = costResult.total;
          }

          totalCost += msgCost;
          messageCount++;
          if (timestamp > lastTimestamp) {
            lastTimestamp = timestamp;
          }

          // Aggregate by model
          if (!models[model]) {
            models[model] = {
              cost: 0,
              inputTokens: 0,
              outputTokens: 0,
              cacheReadTokens: 0,
              cacheWriteTokens: 0,
              messageCount: 0
            };
          }

          models[model].cost += msgCost;
          models[model].inputTokens += inputTokens;
          models[model].outputTokens += outputTokens;
          models[model].cacheReadTokens += cacheReadTokens;
          models[model].cacheWriteTokens += cacheWriteTokens;
          models[model].messageCount++;
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    if (messageCount === 0) {
      return null;
    }

    return {
      sessionId,
      totalCost,
      models,
      messageCount,
      lastTimestamp
    };
  } catch (error) {
    console.error('[openclaw-face-cost-tracker] Error parsing JSONL file:', filePath, error);
    return null;
  }
}

/**
 * Calculate costs for all sessions in the last hour
 */
async function calculateRecentCosts(sessionKey: string): Promise<CostPayload | null> {
  const sessionDir = path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions');
  
  if (!fs.existsSync(sessionDir)) {
    console.error('[openclaw-face-cost-tracker] Session directory not found:', sessionDir);
    return null;
  }

  try {
    const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.jsonl'));
    
    // Get all session costs from the last hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let totalCost = 0;
    let totalMessages = 0;
    let lastMessageTime = '';
    const allModels: Record<string, {
      cost: number;
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheWriteTokens: number;
      messageCount: number;
    }> = {};

    for (const file of files) {
      const filePath = path.join(sessionDir, file);
      const stats = fs.statSync(filePath);
      
      // Only check recent files
      if (stats.mtime.getTime() > oneHourAgo) {
        const sessionCost = await parseJsonlFile(filePath);
        
        if (sessionCost) {
          totalCost += sessionCost.totalCost;
          totalMessages += sessionCost.messageCount;
          
          if (sessionCost.lastTimestamp > lastMessageTime) {
            lastMessageTime = sessionCost.lastTimestamp;
          }

          // Merge models
          for (const [model, data] of Object.entries(sessionCost.models)) {
            if (!allModels[model]) {
              allModels[model] = {
                cost: 0,
                inputTokens: 0,
                outputTokens: 0,
                cacheReadTokens: 0,
                cacheWriteTokens: 0,
                messageCount: 0
              };
            }
            
            allModels[model].cost += data.cost;
            allModels[model].inputTokens += data.inputTokens;
            allModels[model].outputTokens += data.outputTokens;
            allModels[model].cacheReadTokens += data.cacheReadTokens;
            allModels[model].cacheWriteTokens += data.cacheWriteTokens;
            allModels[model].messageCount += data.messageCount;
          }
        }
      }
    }

    if (totalMessages === 0) {
      return null;
    }

    return {
      timestamp: new Date().toISOString(),
      sessionKey,
      totalCost,
      models: allModels,
      messageCount: totalMessages,
      lastMessageTime
    };
  } catch (error) {
    console.error('[openclaw-face-cost-tracker] Error calculating costs:', error);
    return null;
  }
}

/**
 * Timer management for delayed cost calculation
 */
const timers = new Map<string, NodeJS.Timeout>();

/**
 * Schedule cost calculation after 1 minute
 */
export function scheduleCostCalculation(sessionKey: string): void {
  // Clear existing timer for this session
  if (timers.has(sessionKey)) {
    clearTimeout(timers.get(sessionKey)!);
  }

  // Set new timer for 1 minute (60,000 ms)
  const timer = setTimeout(async () => {
    console.log(`[openclaw-face-cost-tracker] Calculating costs for session: ${sessionKey}`);
    
    const costPayload = await calculateRecentCosts(sessionKey);
    if (costPayload) {
      await uploadCost(costPayload);
    }
    
    // Clean up timer
    timers.delete(sessionKey);
  }, 60000);

  timers.set(sessionKey, timer);
  console.log(`[openclaw-face-cost-tracker] Scheduled cost calculation in 1 minute for: ${sessionKey}`);
}

/**
 * OpenClaw HookHandler
 *
 * Listens for message:received events and schedules cost calculation
 * with 1-minute delay to batch multiple messages.
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
  console.log(`[openclaw-face-cost-tracker] Event received: type=${event.type}, action=${event.action}, sessionKey=${event.sessionKey}`);

  if (event.type !== 'message' || event.action !== 'received') {
    return;
  }

  // Schedule cost calculation with 1-minute delay
  scheduleCostCalculation(event.sessionKey);
};

export default handler;
