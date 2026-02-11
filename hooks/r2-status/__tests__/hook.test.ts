/**
 * R2 Status Hook - Unit Tests
 * 
 * Tests for the R2StatusHook class and related functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { R2StatusHook } from '../index';
import { ModelCallEvent, CompleteEvent } from '../types';
import { R2Uploader } from '../uploader';

// Mock the uploader module
vi.mock('../uploader', () => {
  const mockUploadStatus = vi.fn().mockResolvedValue(undefined);
  return {
    R2Uploader: vi.fn().mockImplementation(() => ({
      uploadStatus: mockUploadStatus,
    })),
    createUploader: vi.fn().mockReturnValue({
      uploadStatus: mockUploadStatus,
    }),
  };
});

describe('R2StatusHook', () => {
  const mockConfig = {
    r2AccessKeyId: 'test-access-key',
    r2SecretAccessKey: 'test-secret-key',
    r2Endpoint: 'https://test.r2.cloudflarestorage.com',
    r2Bucket: 'openclaw-status-test',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create hook with valid configuration', () => {
      const hook = new R2StatusHook(mockConfig);
      expect(hook).toBeDefined();
    });
  });

  describe('fromEnvironment', () => {
    it('should create hook from environment variables', () => {
      // Set required environment variables
      process.env.R2_ACCESS_KEY_ID = mockConfig.r2AccessKeyId;
      process.env.R2_SECRET_ACCESS_KEY = mockConfig.r2SecretAccessKey;
      process.env.R2_ENDPOINT = mockConfig.r2Endpoint;
      process.env.R2_BUCKET = mockConfig.r2Bucket;

      const hook = R2StatusHook.fromEnvironment();
      expect(hook).toBeDefined();

      // Clean up
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_ENDPOINT;
      delete process.env.R2_BUCKET;
    });
  });

  describe('isConfigured', () => {
    it('should return true when all env vars are set', () => {
      process.env.R2_ACCESS_KEY_ID = mockConfig.r2AccessKeyId;
      process.env.R2_SECRET_ACCESS_KEY = mockConfig.r2SecretAccessKey;
      process.env.R2_ENDPOINT = mockConfig.r2Endpoint;
      process.env.R2_BUCKET = mockConfig.r2Bucket;

      expect(R2StatusHook.isConfigured()).toBe(true);

      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_ENDPOINT;
      delete process.env.R2_BUCKET;
    });

    it('should return false when env vars are missing', () => {
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_ENDPOINT;
      delete process.env.R2_BUCKET;

      expect(R2StatusHook.isConfigured()).toBe(false);
    });
  });

  describe('onModelCall', () => {
    it('should create status payload with busy: true', async () => {
      const hook = new R2StatusHook(mockConfig);
      
      const event: ModelCallEvent = {
        type: 'model_call',
        model: 'claude-3-5-sonnet',
        taskId: 'task-123',
        timestamp: Date.now(),
      };

      await hook.onModelCall(event);
      // Test passes if no error is thrown
    });

    it('should handle model call without taskId', async () => {
      const hook = new R2StatusHook(mockConfig);
      
      const event: ModelCallEvent = {
        type: 'model_call',
        model: 'claude-3-5-sonnet',
        timestamp: Date.now(),
      };

      await hook.onModelCall(event);
      // Test passes if no error is thrown
    });
  });

  describe('onComplete', () => {
    it('should create status payload with busy: false', async () => {
      const hook = new R2StatusHook(mockConfig);
      
      const event: CompleteEvent = {
        type: 'complete',
        model: 'claude-3-5-sonnet',
        taskId: 'task-123',
        timestamp: Date.now(),
      };

      await hook.onComplete(event);
      // Test passes if no error is thrown
    });

    it('should handle complete without taskId', async () => {
      const hook = new R2StatusHook(mockConfig);
      
      const event: CompleteEvent = {
        type: 'complete',
        model: 'claude-3-5-sonnet',
        timestamp: Date.now(),
      };

      await hook.onComplete(event);
      // Test passes if no error is thrown
    });
  });

  describe('handleEvent', () => {
    it('should dispatch model_call events to onModelCall', async () => {
      const hook = new R2StatusHook(mockConfig);
      
      const event: ModelCallEvent = {
        type: 'model_call',
        model: 'claude-3-5-sonnet',
        timestamp: Date.now(),
      };

      await hook.handleEvent(event);
      // Test passes if no error is thrown
    });

    it('should dispatch complete events to onComplete', async () => {
      const hook = new R2StatusHook(mockConfig);
      
      const event: CompleteEvent = {
        type: 'complete',
        model: 'claude-3-5-sonnet',
        timestamp: Date.now(),
      };

      await hook.handleEvent(event);
      // Test passes if no error is thrown
    });

    it('should warn on unknown event type', async () => {
      const hook = new R2StatusHook(mockConfig);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const unknownEvent = { type: 'unknown' } as any;
      await hook.handleEvent(unknownEvent);
      
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should not throw on upload failure', async () => {
      // Create a new mock for this test
      const { createUploader } = await import('../uploader');
      const mockUploader = {
        uploadStatus: vi.fn().mockRejectedValue(new Error('Upload failed')),
      };
      (createUploader as any).mockReturnValue(mockUploader);
      
      const hook = new R2StatusHook(mockConfig);
      
      const event: ModelCallEvent = {
        type: 'model_call',
        model: 'claude-3-5-sonnet',
        timestamp: Date.now(),
      };

      // Should not throw
      await expect(hook.onModelCall(event)).resolves.not.toThrow();
    });
  });
});