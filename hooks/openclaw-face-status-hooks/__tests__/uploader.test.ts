/**
 * R2 Status Hook - Uploader Unit Tests
 * 
 * Tests for the R2Uploader class and related functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UploadError } from '../uploader';
import { R2Config, StatusPayload } from '../types';

describe('R2Uploader', () => {
  const mockConfig: R2Config = {
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    R2_ENDPOINT: 'https://test.r2.cloudflarestorage.com',
    R2_BUCKET: 'openclaw-status-test',
  };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create uploader with valid config', async () => {
      const { R2Uploader } = await import('../uploader');
      const uploader = new R2Uploader(mockConfig);
      expect(uploader).toBeDefined();
    });
  });

  describe('createUploader', () => {
    it('should create uploader using factory function', async () => {
      const { createUploader } = await import('../uploader');
      const uploader = createUploader(mockConfig);
      expect(uploader).toBeDefined();
    });
  });

  describe('uploadStatus', () => {
    it('should throw UploadError on failure', async () => {
      // Mock S3Client at prototype level
      const { S3Client } = await import('@aws-sdk/client-s3');
      const mockSend = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.spyOn(S3Client.prototype, 'send').mockImplementation(mockSend);
      
      const { R2Uploader } = await import('../uploader');
      const uploader = new R2Uploader(mockConfig);
      
      const payload: StatusPayload = {
        busy: true,
        model: 'claude-3-5-sonnet',
        ts: Date.now(),
      };

      await expect(uploader.uploadStatus(payload)).rejects.toThrow(UploadError);
    });
  });
});

describe('UploadError', () => {
  it('should create error with message and cause', () => {
    const cause = new Error('Original error');
    const error = new UploadError('Upload failed', cause);
    
    expect(error.message).toBe('Upload failed');
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('UploadError');
  });

  it('should create error without cause', () => {
    const error = new UploadError('Upload failed');
    
    expect(error.message).toBe('Upload failed');
    expect(error.cause).toBeUndefined();
    expect(error.name).toBe('UploadError');
  });
});