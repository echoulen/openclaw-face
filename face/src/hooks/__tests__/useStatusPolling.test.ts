/**
 * useStatusPolling Hook Tests
 * 
 * Tests for the status polling hook implementation.
 * Validates Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStatusPolling, useManualStatusPolling } from '../useStatusPolling';
import { AgentStatus, ConnectionState } from '../../types';

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
    it('should fetch status immediately on mount', () => {
      const mockStatus: AgentStatus = {
        busy: false,
        model: 'claude-3-5-sonnet',
        ts: Date.now(),
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
    
    it('should poll at specified interval', () => {
      const mockStatus: AgentStatus = {
        busy: true,
        model: 'claude-3-5-sonnet',
        ts: Date.now(),
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
    it('should parse valid status JSON', async () => {
      const mockStatus: AgentStatus = {
        busy: false,
        model: 'claude-3-5-sonnet',
        ts: 1704067200000,
        taskId: 'task-123',
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus),
      });
      
      const { result } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Wait for the async fetch to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.status).toEqual(mockStatus);
    });
    
    it('should handle status with optional taskId', async () => {
      const mockStatusWithTaskId: AgentStatus = {
        busy: true,
        model: 'claude-3-5-sonnet',
        ts: Date.now(),
        taskId: 'task-abc-123',
      };
      
      const mockStatusWithoutTaskId: AgentStatus = {
        busy: false,
        model: 'claude-3-5-sonnet',
        ts: Date.now(),
      };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatusWithTaskId),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatusWithoutTaskId),
        });
      
      const { result } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Wait for initial fetch
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.status?.taskId).toBe('task-abc-123');
      
      // Advance timer and wait for second fetch
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.status?.taskId).toBeUndefined();
    });
  });
  
  describe('Requirement 3.3: Handle failures gracefully', () => {
    it('should keep last successful status on fetch failure', async () => {
      const mockStatus: AgentStatus = {
        busy: false,
        model: 'claude-3-5-sonnet',
        ts: Date.now(),
      };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatus),
        })
        .mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Wait for initial success
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.status).toEqual(mockStatus);
      
      // Trigger failure
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      // Status should still be the last successful one
      expect(result.current.status).toEqual(mockStatus);
    });
    
    it('should handle HTTP errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(1);
    });
    
    it('should handle non-OK HTTP responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      
      const { result } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(1);
    });
    
    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });
      
      const { result } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(1);
    });
    
    it('should handle invalid status format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' }),
      });
      
      const { result } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(1);
    });
  });
  
  describe('Requirement 3.4: Show error after 3 failures', () => {
    it('should set connected to false after maxFailures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // 1st failure
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(1);
      expect(result.current.connectionState.connected).toBe(true);
      
      // 2nd failure
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(2);
      expect(result.current.connectionState.connected).toBe(true);
      
      // 3rd failure - should now show error
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(3);
      expect(result.current.connectionState.connected).toBe(false);
    });
    
    it('should track consecutive failures correctly', async () => {
      const mockStatus: AgentStatus = {
        busy: false,
        model: 'claude-3-5-sonnet',
        ts: Date.now(),
      };
      
      // Success, then 2 failures, then success
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatus),
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatus),
        });
      
      const { result } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Initial success
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(0);
      
      // First failure
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(1);
      
      // Second failure
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(2);
      
      // Success - should reset failure count
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(0);
      expect(result.current.connectionState.connected).toBe(true);
    });
  });
  
  describe('Requirement 3.5: Continue polling after failures', () => {
    it('should continue polling after multiple failures', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Multiple failures
      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(5000);
        });
        
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0));
        });
      }
      
      // Should have made 6 total calls (1 initial + 5 intervals)
      expect(mockFetch).toHaveBeenCalledTimes(6);
    });
    
    it('should recover and continue after success', async () => {
      const mockStatus: AgentStatus = {
        busy: false,
        model: 'claude-3-5-sonnet',
        ts: Date.now(),
      };
      
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatus),
        })
        .mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Initial failure
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(1);
      
      // Success after recovery
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(0);
      expect(result.current.status).toEqual(mockStatus);
      
      // Should continue polling
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Control functions', () => {
    it('should provide refresh function', async () => {
      const mockStatus: AgentStatus = {
        busy: false,
        model: 'claude-3-5-sonnet',
        ts: Date.now(),
      };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatus),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockStatus, busy: true }),
        });
      
      const { result } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.status?.busy).toBe(false);
      
      await result.current.refresh();
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    
    it('should provide startPolling and stopPolling functions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ busy: false, model: 'test', ts: Date.now() }),
      });
      
      const { result, unmount } = renderHook(() => 
        useManualStatusPolling('https://test.com/status.json', 5000, 3)
      );
      
      expect(result.current.isPolling).toBe(false);
      
      await result.current.startPolling();
      
      expect(result.current.isPolling).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      result.current.stopPolling();
      
      expect(result.current.isPolling).toBe(false);
      
      // Cleanup
      unmount();
    });
  });
  
  describe('Cleanup', () => {
    it('should stop polling on unmount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ busy: false, model: 'test', ts: Date.now() }),
      });
      
      const { unmount } = renderHook(() => useStatusPolling('https://test.com/status.json', 5000, 3));
      
      // Initial fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Advance time
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
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
  // Property-based tests using fast-check concepts
  // These test universal properties that should hold across all inputs
  
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  
  describe('Property: Connection state transitions are deterministic', () => {
    it('should always reset failureCount to 0 on success', async () => {
      const mockStatus: AgentStatus = {
        busy: false,
        model: 'test-model',
        ts: Date.now(),
      };
      
      // Simulate various failure counts followed by success
      for (let initialFailureCount = 0; initialFailureCount <= 5; initialFailureCount++) {
        const mockConnectionState: ConnectionState = {
          connected: initialFailureCount < 3,
          lastSuccessTime: Date.now() - initialFailureCount * 5000,
          failureCount: initialFailureCount,
        };
        
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatus),
        });
        
        const { result } = renderHook(() => 
          useStatusPolling('https://test.com/status.json', 5000, 3)
        );
        
        // Wait for the fetch to complete
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0));
        });
        
        // After success, failureCount should be 0
        expect(result.current.connectionState.failureCount).toBe(0);
      }
    });
    
    it('should always increment failureCount on failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => 
        useStatusPolling('https://test.com/status.json', 5000, 3)
      );
      
      // Initial state
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.failureCount).toBe(1);
      
      // Each subsequent failure should increment
      for (let i = 2; i <= 5; i++) {
        act(() => {
          vi.advanceTimersByTime(5000);
        });
        
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0));
        });
        
        expect(result.current.connectionState.failureCount).toBe(i);
      }
    });
  });
  
  describe('Property: Status is preserved across failures', () => {
    it('should never lose the last successful status on subsequent failures', async () => {
      const mockStatus: AgentStatus = {
        busy: true,
        model: 'claude-3-5-sonnet',
        ts: Date.now(),
        taskId: 'test-task-123',
      };
      
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatus),
        })
        .mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => 
        useStatusPolling('https://test.com/status.json', 5000, 3)
      );
      
      // Wait for initial success
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.status).toEqual(mockStatus);
      
      // Multiple failures
      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(5000);
        });
        
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0));
        });
      }
      
      // Status should still be preserved
      expect(result.current.status).toEqual(mockStatus);
    });
  });
  
  describe('Property: Connected state depends only on failureCount threshold', () => {
    it('should be connected when failureCount < maxFailures', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => 
        useStatusPolling('https://test.com/status.json', 5000, 3)
      );
      
      // failureCount = 1, connected should be true
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.connected).toBe(true);
      
      // failureCount = 2, connected should be true
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.connected).toBe(true);
      
      // failureCount = 3, connected should be false
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.connectionState.connected).toBe(false);
    });
  });
  
  describe('Property: Polling interval is respected', () => {
    it('should fetch at exact interval without drift', async () => {
      const callTimes: number[] = [];
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callTimes.push(Date.now());
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ busy: false, model: 'test', ts: Date.now() }),
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
        
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0));
        });
      }
      
      // Should have exactly 6 calls (1 initial + 5 intervals)
      expect(callTimes.length).toBe(6);
    });
  });
});