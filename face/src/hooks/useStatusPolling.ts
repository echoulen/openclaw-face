/**
 * OpenClaw Face - Status Polling Hook
 * 
 * Implements polling logic for fetching agent status from R2.
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AgentStatus, ConnectionState, defaultConnectionState } from '../types';
import { R2_PUBLIC_URL } from '../config';

/**
 * Status polling hook result
 */
export interface UseStatusPollingResult {
  /** Current agent status (null if no successful fetch yet) */
  status: AgentStatus | null;
  /** Connection state with failure tracking */
  connectionState: ConnectionState;
  /** Manually trigger a status fetch */
  refresh: () => Promise<void>;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
}

/**
 * Custom hook for polling agent status from R2
 * 
 * Features:
 * - Polls every 5 seconds (configurable)
 * - Fetches and parses JSON from R2 public URL
 * - Handles errors with retry logic
 * - Manages connection state (failure count, connected status)
 * - Continues polling after failures
 * 
 * @param r2Url - URL to fetch status from (defaults to R2_PUBLIC_URL)
 * @param interval - Polling interval in milliseconds (default: 5000)
 * @param maxFailures - Maximum consecutive failures before showing error (default: 3)
 * @returns Status polling result with status, connection state, and control functions
 */
export function useStatusPolling(
  r2Url: string = R2_PUBLIC_URL,
  interval: number = 5000,
  maxFailures: number = 3
): UseStatusPollingResult {
  // Current agent status (null if no successful fetch yet)
  const [status, setStatus] = useState<AgentStatus | null>(null);
  
  // Connection state with failure tracking
  const [connectionState, setConnectionState] = useState<ConnectionState>(defaultConnectionState);
  
  // Refs for managing polling lifecycle
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef<boolean>(false);
  
  /**
   * Fetch status from R2 and update state
   */
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(r2Url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Parse JSON response (Requirement 3.2)
      const data = await response.json();
      
      // Validate required fields
      if (typeof data.busy !== 'boolean' || typeof data.model !== 'string' || typeof data.ts !== 'number') {
        throw new Error('Invalid status format: missing required fields');
      }
      
      // Update status with parsed data
      const newStatus: AgentStatus = {
        busy: data.busy,
        model: data.model,
        ts: data.ts,
        taskId: data.taskId,
      };
      
      setStatus(newStatus);
      
      // Update connection state on success (Requirement 3.5)
      setConnectionState(_prev => ({
        connected: true,
        lastSuccessTime: Date.now(),
        failureCount: 0,
      }));
      
      console.log('[useStatusPolling] Status updated:', newStatus);
    } catch (error) {
      // Handle errors (Requirement 3.3)
      console.error('[useStatusPolling] Fetch failed:', error);
      
      setConnectionState(prev => {
        const newFailureCount = prev.failureCount + 1;
        const isConnected = newFailureCount < maxFailures;
        
        return {
          connected: isConnected,
          lastSuccessTime: prev.lastSuccessTime,
          failureCount: newFailureCount,
        };
      });
    }
  }, [r2Url, maxFailures]);
  
  /**
   * Start polling (Requirement 3.1)
   */
  const startPolling = useCallback(() => {
    if (isPollingRef.current) {
      return;
    }
    
    isPollingRef.current = true;
    
    // Initial fetch
    fetchStatus();
    
    // Set up interval for polling
    intervalIdRef.current = setInterval(fetchStatus, interval);
    
    console.log('[useStatusPolling] Polling started');
  }, [fetchStatus, interval]);
  
  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    
    isPollingRef.current = false;
    console.log('[useStatusPolling] Polling stopped');
  }, []);
  
  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);
  
  // Set up polling on mount
  useEffect(() => {
    startPolling();
    
    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);
  
  return {
    status,
    connectionState,
    refresh,
    startPolling,
    stopPolling,
  };
}

/**
 * Hook for managing status polling with manual control
 * Similar to useStatusPolling but doesn't auto-start
 */
export function useManualStatusPolling(
  r2Url: string = R2_PUBLIC_URL,
  interval: number = 5000,
  maxFailures: number = 3
): UseStatusPollingResult & { isPolling: boolean } {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(defaultConnectionState);
  const [isPolling, setIsPolling] = useState(false);
  
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(r2Url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (typeof data.busy !== 'boolean' || typeof data.model !== 'string' || typeof data.ts !== 'number') {
        throw new Error('Invalid status format: missing required fields');
      }
      
      const newStatus: AgentStatus = {
        busy: data.busy,
        model: data.model,
        ts: data.ts,
        taskId: data.taskId,
      };
      
      setStatus(newStatus);
      
      setConnectionState(_prev => ({
        connected: true,
        lastSuccessTime: Date.now(),
        failureCount: 0,
      }));
      
      console.log('[useStatusPolling] Status updated:', newStatus);
    } catch (error) {
      console.error('[useStatusPolling] Fetch failed:', error);
      
      setConnectionState(prev => {
        const newFailureCount = prev.failureCount + 1;
        const isConnected = newFailureCount < maxFailures;
        
        return {
          connected: isConnected,
          lastSuccessTime: prev.lastSuccessTime,
          failureCount: newFailureCount,
        };
      });
    }
  }, [r2Url, maxFailures]);
  
  const startPolling = useCallback(() => {
    if (isPolling) {
      return;
    }
    
    setIsPolling(true);
    fetchStatus();
    
    intervalIdRef.current = setInterval(fetchStatus, interval);
  }, [fetchStatus, interval, isPolling]);
  
  const stopPolling = useCallback(() => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    
    setIsPolling(false);
  }, []);
  
  const refresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);
  
  return {
    status,
    connectionState,
    refresh,
    startPolling,
    stopPolling,
    isPolling,
  };
}