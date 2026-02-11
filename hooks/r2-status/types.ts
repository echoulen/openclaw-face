/**
 * R2 Status Hook - Type Definitions
 */

/**
 * R2 configuration interface
 */
export interface R2Config {
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ENDPOINT: string;
  R2_BUCKET: string;
}

/**
 * Status payload for R2 upload
 */
export interface StatusPayload {
  busy: boolean;
  model: string;
  ts: number;
  taskId?: string;
}

/**
 * Model call event from OpenClaw
 */
export interface ModelCallEvent {
  type: 'model_call';
  model: string;
  taskId?: string;
  timestamp: number;
}

/**
 * Complete event from OpenClaw
 */
export interface CompleteEvent {
  type: 'complete';
  model: string;
  taskId?: string;
  timestamp: number;
}

/**
 * Union type for all supported events
 */
export type OpenClawEvent = ModelCallEvent | CompleteEvent;

/**
 * Hook configuration interface
 */
export interface HookConfig {
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Endpoint: string;
  r2Bucket: string;
}