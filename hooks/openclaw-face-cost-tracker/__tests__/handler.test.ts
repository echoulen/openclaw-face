import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../handler.js';
import { uploadCost, scheduleCostCalculation } from '../handler.js';
import * as fs from 'fs';

// Mock AWS S3
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn()
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    createReadStream: vi.fn()
  },
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  createReadStream: vi.fn()
}));

// Mock readline
vi.mock('readline', () => ({
  createInterface: vi.fn()
}));

// Mock timers - using Vitest's built-in timer mocks
// const mockSetTimeout = vi.fn() as any;
// const mockClearTimeout = vi.fn() as any;
// global.setTimeout = mockSetTimeout;
// global.clearTimeout = mockClearTimeout;

// Mock console
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
};

describe('Cost Tracker Hook', () => {
  let mockSetTimeout: any;
  let mockClearTimeout: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all timers
    vi.useFakeTimers();
    // Mock timers
    mockSetTimeout = vi.spyOn(globalThis, 'setTimeout');
    mockClearTimeout = vi.spyOn(globalThis, 'clearTimeout');
    // Reset console mocks
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should ignore non-message events', async () => {
    const event = {
      type: 'other',
      action: 'received',
      sessionKey: 'test-session',
      timestamp: new Date(),
      messages: [],
      context: {}
    };

    await handler(event);
    
    // Should not schedule any timer
    expect(mockSetTimeout).not.toHaveBeenCalled();
  });

  it('should ignore message:sent events', async () => {
    const event = {
      type: 'message',
      action: 'sent',
      sessionKey: 'test-session',
      timestamp: new Date(),
      messages: [],
      context: {}
    };

    await handler(event);
    
    // Should not schedule any timer
    expect(mockSetTimeout).not.toHaveBeenCalled();
  });

  it('should schedule cost calculation on message:received', async () => {
    // Test scheduleCostCalculation directly
    scheduleCostCalculation('test-session');
    
    // Should schedule a timer for 60 seconds
    expect(mockSetTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      60000
    );
  });

  it('should reset timer on multiple messages', async () => {
    const event = {
      type: 'message',
      action: 'received',
      sessionKey: 'test-session',
      timestamp: new Date(),
      messages: ['message 1'],
      context: {}
    };

    // First message
    await handler(event);
    const firstCallCount = mockSetTimeout.mock.calls.length;
    
    // Wait a bit
    await vi.advanceTimersByTimeAsync(1000);
    
    // Second message should reset the timer
    event.messages = ['message 2'];
    await handler(event);
    
    // Should have called setTimeout twice (once for each message)
    expect(mockSetTimeout).toHaveBeenCalledTimes(2);
    expect(mockClearTimeout).toHaveBeenCalledTimes(2);  // Called twice - once for each message
  });
});

describe('uploadCost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip upload when R2_BUCKET is not set', async () => {
    delete process.env.R2_BUCKET;
    
    const payload = {
      timestamp: '2026-02-24T19:23:00.000Z',
      sessionKey: 'test',
      totalCost: 0.01,
      models: {},
      messageCount: 1,
      lastMessageTime: '2026-02-24T19:23:00.000Z'
    };

    await uploadCost(payload);
    
    // Should not attempt upload
    expect(console.error).toHaveBeenCalledWith(
      '[openclaw-face-cost-tracker] R2_BUCKET not set, skipping upload'
    );
  });

  it('should log successful upload', async () => {
    process.env.R2_BUCKET = 'test-bucket';
    
    // Mock S3 send to resolve successfully
    const { S3Client } = await import('@aws-sdk/client-s3');
    const mockS3Send = vi.fn().mockResolvedValue({});
    (S3Client as any).mockImplementation(() => ({
      send: mockS3Send
    }));
    
    const payload = {
      timestamp: '2026-02-24T19:23:00.000Z',
      sessionKey: 'test',
      totalCost: 0.0159,
      models: {},
      messageCount: 1,
      lastMessageTime: '2026-02-24T19:23:00.000Z'
    };

    await uploadCost(payload);
    
    expect(console.log).toHaveBeenCalledWith(
      '[openclaw-face-cost-tracker] Uploaded cost: $0.0159 for 1 messages'
    );
  });
});
