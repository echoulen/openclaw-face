/**
 * R2 Status Hook - R2 Uploader Module
 * 
 * Handles uploading status payloads to Cloudflare R2 using AWS S3 SDK.
 */

import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { R2Config, StatusPayload } from './types';

/**
 * Upload timeout in milliseconds (5 seconds as per requirements)
 */
const UPLOAD_TIMEOUT_MS = 5000;

/**
 * Status file key in R2 bucket
 */
const STATUS_FILE_KEY = 'status.json';

/**
 * Content type for status JSON files
 */
const STATUS_CONTENT_TYPE = 'application/json';

/**
 * Error class for upload failures
 */
export class UploadError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * R2 Uploader class responsible for uploading status payloads to R2
 */
export class R2Uploader {
  private client: S3Client;
  private bucket: string;

  /**
   * Creates a new R2Uploader instance
   * 
   * @param config - R2 configuration object
   * 
   * @example
   * ```typescript
   * const config = loadConfig();
   * const uploader = new R2Uploader(config);
   * ```
   */
  constructor(config: R2Config) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.R2_ENDPOINT,
      credentials: {
        accessKeyId: config.R2_ACCESS_KEY_ID,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY,
      },
    });

    this.bucket = config.R2_BUCKET;
  }

  /**
   * Uploads a status payload to R2
   * 
   * @param payload - The status payload to upload
   * @returns Promise that resolves when upload is complete
   * @throws UploadError if upload fails
   * 
   * @example
   * ```typescript
   * const uploader = new R2Uploader(config);
   * await uploader.uploadStatus({
   *   busy: true,
   *   model: 'claude-3-5-sonnet',
   *   ts: Date.now(),
   *   taskId: 'task-123'
   * });
   * ```
   */
  async uploadStatus(payload: StatusPayload): Promise<void> {
    const startTime = Date.now();

    try {
      const command = this.createPutObjectCommand(payload);
      await this.client.send(command);

      const duration = Date.now() - startTime;
      console.log(
        `[r2-status] Successfully uploaded status to R2 ` +
        `(bucket: ${this.bucket}, key: ${STATUS_FILE_KEY}, duration: ${duration}ms)`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.handleUploadError(error, payload, duration);
    }
  }

  /**
   * Creates a PutObjectCommand for the given payload
   */
  private createPutObjectCommand(payload: StatusPayload): PutObjectCommand {
    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: STATUS_FILE_KEY,
      Body: JSON.stringify(payload),
      ContentType: STATUS_CONTENT_TYPE,
      CacheControl: 'no-cache',
    };

    return new PutObjectCommand(params);
  }

  /**
   * Handles upload errors with proper logging
   * 
   * @param error - The error that occurred
   * @param payload - The payload that failed to upload
   * @param duration - Time spent attempting the upload
   * @throws UploadError always, after logging
   */
  private handleUploadError(
    error: unknown,
    payload: StatusPayload,
    duration: number
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(
      `[r2-status] Failed to upload status to R2: ${errorMessage}`,
      {
        bucket: this.bucket,
        key: STATUS_FILE_KEY,
        duration: `${duration}ms`,
        payload: JSON.stringify(payload),
        cause: error,
      }
    );

    throw new UploadError(
      `Failed to upload status to R2: ${errorMessage}`,
      error
    );
  }
}

/**
 * Creates a new R2Uploader instance from configuration
 * 
 * @param config - R2 configuration object
 * @returns Configured R2Uploader instance
 * 
 * @example
 * ```typescript
 * const config = loadConfig();
 * const uploader = createUploader(config);
 * ```
 */
export function createUploader(config: R2Config): R2Uploader {
  return new R2Uploader(config);
}