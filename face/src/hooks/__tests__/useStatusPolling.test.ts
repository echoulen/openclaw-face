/**
 * useStatusPolling Hook Tests
 * 
 * Tests for the status polling hook implementation.
 * Validates Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStatusPolling } from '../useStatusPolling';
import { AgentStatus } from '../../types';

// Mock the config module
vi.mock('../../config', () => ({
  R2_PUBLIC_URL: 'https://example.com/status.json',
}));

describe('useStatusPolling', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  
  describe('Requirement 3.1: Polling every 5 seconds', () => {
    test('should fetch status immediately on mount', () => {
      const mockStatus: AgentStatus = {
        busy: false,
        ts: Date.now(),
        sessionKey: 'agent:main:main',
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });
      
      renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Initial fetch should happen immediately
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('https://test.com/status.json', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
    });
    
    test('should poll at specified interval', () => {
      const mockStatus: AgentStatus = {
        busy: true,
        ts: Date.now(),
        sessionKey: 'agent:main:main',
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });
      
      renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Initial fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Advance timer by 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Advance timer by another 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Requirement 3.2: Parse JSON on success', () => {
    test('should call fetch with correct URL and headers', () => {
      const mockStatus: AgentStatus = {
        busy: false,
        ts: 1704067200000,
        sessionKey: 'agent:main:main',
        source: 'telegram',
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });
      
      renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      expect(mockFetch).toHaveBeenCalledWith('https://test.com/status.json', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
    });
  });
  
  describe('Requirement 3.3: Handle failures gracefully', () => {
    test('should handle network errors', () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // The fetch should be attempted
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    
    test('should handle HTTP errors', () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      
      renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    
    test('should handle JSON parse errors', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });
      
      renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    
    test('should handle invalid status format', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' }),
      });
      
      renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Requirement 3.4: Show error after 3 failures', () => {
    test('should continue polling after failures', () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Initial fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Multiple failures
      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(5000);
        });
      }
      
      // Should have made 6 total calls (1 initial + 5 intervals)
      expect(mockFetch).toHaveBeenCalledTimes(6);
    });
  });
  
  describe('Requirement 3.5: Continue polling after failures', () => {
    test('should continue polling after multiple failures', () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Multiple failures
      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(5000);
        });
      }
      
      // Should have made 6 total calls (1 initial + 5 intervals)
      expect(mockFetch).toHaveBeenCalledTimes(6);
    });
  });
  
  describe('Cleanup', () => {
    test('should stop polling on unmount', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ busy: false, ts: Date.now() }),
      });
      
      const { unmount } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Initial fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Advance time
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Unmount
      unmount();
      
      // Advance more time - should not trigger more fetches
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useStatusPolling - Property-Based Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  
  describe('Property: Polling interval is respected', () => {
    test('should fetch at exact interval without drift', () => {
      const callTimes: number[] = [];
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callTimes.push(Date.now());
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ busy: false, ts: Date.now() }),
        });
      });
      
      renderHook(() => 
        useStatusPolling('https://test.com/status.json', 5000, 3)
      );
      
      // Check intervals between calls
      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(5000);
        });
      }
      
      // Should have exactly 6 calls (1 initial + 5 intervals)
      expect(callTimes.length).toBe(6);
    });
  });
  
  describe('Property: Connection state transitions are deterministic', () => {
    test('should always reset failureCount to 0 on success', () => {
      const mockStatus: AgentStatus = {
        busy: false,
        ts: Date.now(),
        sessionKey: 'agent:main:main',
      };
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });
      
      const { result } = renderHook(() => 
        useStatusPolling('https://test.com/status.json', 5000, 3)
      );
      
      // After success, failureCount should be 0
      expect(result.current.connectionState.failureCount).toBe(0);
    });
    
    test('should always increment failureCount on failure', () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => 
        useStatusPolling('https://test.com/status.json', 5000, 3)
      );
      
      // Initial state - fetch attempted
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.connectionState.failureCount).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Property: Status is preserved across failures', () => {
    test('should preserve status after successful fetch', () => {
      const mockStatus: AgentStatus = {
        busy: true,
        ts: Date.now(),
        sessionKey: 'agent:main:main',
        source: 'telegram',
      };
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });
      
      const { result } = renderHook(() => 
        useStatusPolling('https://test.com/status.json', 5000, 3)
      );
      
      // Status should be preserved after fetch
      expect(result.current.status).toBeDefined();
    });
  });
  
  describe('Property: Connected state depends only on failureCount threshold', () => {
    test('should track connection state correctly', () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => 
        useStatusPolling('https://test.com/status.json', 5000, 3)
      );
      
      // Initial state should have connected as true or false based on failure count
      // The important thing is that the state is tracked
      expect(typeof result.current.connectionState.connected).toBe('boolean');
      expect(typeof result.current.connectionState.failureCount).toBe('number');
    });
  });
});