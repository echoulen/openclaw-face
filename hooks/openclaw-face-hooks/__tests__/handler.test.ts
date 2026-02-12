/**
 * R2 Status Hook - Handler Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @aws-sdk/client-s3 before importing handler
const mockSend = vi.fn().mockResolvedValue({});
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn().mockImplementation((params) => params),
}));

import handler, { uploadStatus, StatusPayload } from '../handler';

describe('handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.R2_BUCKET = 'test-bucket';
    process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.R2_BUCKET;
    delete process.env.R2_ENDPOINT;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
  });

  function createEvent(action: string, type = 'command') {
    return {
      type,
      action,
      sessionKey: 'agent:main:main',
      timestamp: new Date('2025-01-01T00:00:00Z'),
      messages: [] as string[],
      context: { commandSource: 'telegram' },
    };
  }

  describe('event filtering', () => {
    it('should handle command:new events', async () => {
      await handler(createEvent('new'));
      // Fire-and-forget, give it a tick
      await new Promise((r) => setTimeout(r, 10));
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle command:stop events', async () => {
      await handler(createEvent('stop'));
      await new Promise((r) => setTimeout(r, 10));
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle command:reset events', async () => {
      await handler(createEvent('reset'));
      await new Promise((r) => setTimeout(r, 10));
      expect(mockSend).toHaveBeenCalled();
    });

    it('should ignore non-command events', async () => {
      await handler(createEvent('bootstrap', 'agent'));
      await new Promise((r) => setTimeout(r, 10));
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should treat unknown command actions as busy: false', async () => {
      await handler(createEvent('unknown'));
      await new Promise((r) => setTimeout(r, 10));
      expect(mockSend).toHaveBeenCalled();
      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const calls = vi.mocked(PutObjectCommand).mock.calls;
      const call = calls[calls.length - 1][0] as any;
      const payload = JSON.parse(call.Body) as StatusPayload;
      expect(payload.busy).toBe(false);
    });
  });

  describe('busy state mapping', () => {
    it('command:new should set busy: true', async () => {
      await handler(createEvent('new'));
      await new Promise((r) => setTimeout(r, 10));

      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const call = vi.mocked(PutObjectCommand).mock.calls[0][0] as any;
      const payload = JSON.parse(call.Body) as StatusPayload;
      expect(payload.busy).toBe(true);
    });

    it('command:stop should set busy: false', async () => {
      await handler(createEvent('stop'));
      await new Promise((r) => setTimeout(r, 10));

      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const calls = vi.mocked(PutObjectCommand).mock.calls;
      const call = calls[calls.length - 1][0] as any;
      const payload = JSON.parse(call.Body) as StatusPayload;
      expect(payload.busy).toBe(false);
    });

    it('command:reset should set busy: false', async () => {
      await handler(createEvent('reset'));
      await new Promise((r) => setTimeout(r, 10));

      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const calls = vi.mocked(PutObjectCommand).mock.calls;
      const call = calls[calls.length - 1][0] as any;
      const payload = JSON.parse(call.Body) as StatusPayload;
      expect(payload.busy).toBe(false);
    });
  });

  describe('payload structure', () => {
    it('should include sessionKey and source from event', async () => {
      await handler(createEvent('new'));
      await new Promise((r) => setTimeout(r, 10));

      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const call = vi.mocked(PutObjectCommand).mock.calls[0][0] as any;
      const payload = JSON.parse(call.Body) as StatusPayload;
      expect(payload.sessionKey).toBe('agent:main:main');
      expect(payload.source).toBe('telegram');
      expect(typeof payload.ts).toBe('number');
    });
  });

  describe('uploadStatus', () => {
    it('should skip upload when R2_BUCKET is not set', async () => {
      delete process.env.R2_BUCKET;
      await uploadStatus({ busy: true, ts: Date.now() });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should not throw on upload failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error'));
      await expect(
        uploadStatus({ busy: true, ts: Date.now() })
      ).resolves.not.toThrow();
    });
  });
});
