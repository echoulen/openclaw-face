/**
 * R2 Status Hook - Main Entry Point
 * 
 * OpenClaw hook for pushing agent status to Cloudflare R2.
 * Listens to model_call and complete events, then uploads status to R2.
 */

import {
  loadConfig,
  isConfigured,
  ConfigurationError,
} from './config';
import { createUploader, R2Uploader } from './uploader';
import {
  StatusPayload,
  ModelCallEvent,
  CompleteEvent,
  OpenClawEvent,
  HookConfig,
} from './types';

/**
 * R2 Status Hook class
 * 
 * Handles OpenClaw events and uploads status updates to R2.
 * Does not throw on upload failures - logs errors and continues running.
 */
export class R2StatusHook {
  private uploader: R2Uploader;
  private initialized: boolean = false;
  private initError: Error | null = null;

  /**
   * Creates a new R2StatusHook instance
   * 
   * @param config - Hook configuration
   * @throws ConfigurationError if configuration is invalid
   * 
   * @example
   * ```typescript
   * const hook = new R2StatusHook({
   *   r2AccessKeyId: process.env.R2_ACCESS_KEY_ID!,
   *   r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
   *   r2Endpoint: process.env.R2_ENDPOINT!,
   *   r2Bucket: process.env.R2_BUCKET!,
   * });
   * ```
   */
  constructor(config: HookConfig) {
    try {
      const r2Config = {
        R2_ACCESS_KEY_ID: config.r2AccessKeyId,
        R2_SECRET_ACCESS_KEY: config.r2SecretAccessKey,
        R2_ENDPOINT: config.r2Endpoint,
        R2_BUCKET: config.r2Bucket,
      };
      this.uploader = createUploader(r2Config);
      this.initialized = true;
      console.log('[r2-status] Hook initialized successfully');
    } catch (error) {
      this.initError = error instanceof Error ? error : new Error(String(error));
      console.error('[r2-status] Failed to initialize hook:', this.initError.message);
      throw this.initError;
    }
  }

  /**
   * Creates an R2StatusHook from environment variables
   * 
   * @returns New R2StatusHook instance
   * @throws ConfigurationError if required environment variables are missing
   * 
   * @example
   * ```typescript
   * const hook = R2StatusHook.fromEnvironment();
   * ```
   */
  static fromEnvironment(): R2StatusHook {
    const config = loadConfig();
    return new R2StatusHook({
      r2AccessKeyId: config.R2_ACCESS_KEY_ID,
      r2SecretAccessKey: config.R2_SECRET_ACCESS_KEY,
      r2Endpoint: config.R2_ENDPOINT,
      r2Bucket: config.R2_BUCKET,
    });
  }

  /**
   * Checks if the hook is properly configured
   * 
   * @returns true if hook can be initialized
   */
  static isConfigured(): boolean {
    return isConfigured();
  }

  /**
   * Handles a model_call event - agent started processing
   * 
   * Creates a status payload with busy: true and uploads to R2.
   * 
   * @param event - The model call event
   * @returns Promise that resolves when upload is complete (or fails gracefully)
   * 
   * @example
   * ```typescript
   * await hook.onModelCall({
   *   type: 'model_call',
   *   model: 'claude-3-5-sonnet',
   *   taskId: 'task-123',
   *   timestamp: Date.now(),
   * });
   * ```
   */
  async onModelCall(event: ModelCallEvent): Promise<void> {
    const payload = this.createStatusPayload(event, true);
    await this.uploadStatus(payload);
  }

  /**
   * Handles a complete event - agent finished processing
   * 
   * Creates a status payload with busy: false and uploads to R2.
   * 
   * @param event - The complete event
   * @returns Promise that resolves when upload is complete (or fails gracefully)
   * 
   * @example
   * ```typescript
   * await hook.onComplete({
   *   type: 'complete',
   *   model: 'claude-3-5-sonnet',
   *   taskId: 'task-123',
   *   timestamp: Date.now(),
   * });
   * ```
   */
  async onComplete(event: CompleteEvent): Promise<void> {
    const payload = this.createStatusPayload(event, false);
    await this.uploadStatus(payload);
  }

  /**
   * Handles any OpenClaw event
   * 
   * Dispatches to the appropriate handler based on event type.
   * 
   * @param event - The OpenClaw event
   * @returns Promise that resolves when upload is complete (or fails gracefully)
   * 
   * @example
   * ```typescript
   * await hook.handleEvent({
   *   type: 'model_call',
   *   model: 'claude-3-5-sonnet',
   *   taskId: 'task-123',
   *   timestamp: Date.now(),
   * });
   * ```
   */
  async handleEvent(event: OpenClawEvent): Promise<void> {
    switch (event.type) {
      case 'model_call':
        await this.onModelCall(event);
        break;
      case 'complete':
        await this.onComplete(event);
        break;
      default:
        console.warn('[r2-status] Unknown event type:', (event as { type: string }).type);
    }
  }

  /**
   * Creates a StatusPayload from an event
   * 
   * @param event - The OpenClaw event
   * @param busy - The busy state to set
   * @returns StatusPayload object
   */
  private createStatusPayload(event: OpenClawEvent, busy: boolean): StatusPayload {
    const payload: StatusPayload = {
      busy,
      model: event.model,
      ts: event.timestamp,
    };

    // Include taskId if available (Requirements 1.5)
    if (event.taskId) {
      payload.taskId = event.taskId;
    }

    return payload;
  }

  /**
   * Uploads status payload to R2 with error handling
   * 
   * Does not throw - catches errors and logs them, allowing
   * OpenClaw to continue running normally.
   * 
   * @param payload - The status payload to upload
   */
  private async uploadStatus(payload: StatusPayload): Promise<void> {
    try {
      await this.uploader.uploadStatus(payload);
    } catch (error) {
      // Requirement 7.1: Log error and continue running
      // Requirement 7.2: Do not interrupt OpenClaw normal operation
      console.error(
        `[r2-status] Upload failed but hook continues running:`,
        error instanceof Error ? error.message : String(error)
      );
      // Do not re-throw - hook continues running
    }
  }
}

// Export factory function for convenience
export { loadConfig, isConfigured, ConfigurationError } from './config';
export { R2Uploader, createUploader, UploadError } from './uploader';
export * from './types';