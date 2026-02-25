/**
 * OpenClaw Face - Cost Polling Hook
 * 
 * Implements polling logic for fetching cost data from R2.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CostData, ConnectionState, defaultConnectionState } from '../types';
import { R2_COST_URL } from '../config';

/**
 * Cost polling hook result
 */
export interface UseCostPollingResult {
  /** Current cost data (null if no successful fetch yet) */
  costData: CostData | null;
  /** Connection state with failure tracking */
  connectionState: ConnectionState;
  /** Manually trigger a cost fetch */
  refresh: () => Promise<void>;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
}

/**
 * Custom hook for polling cost data from R2
 * 
 * Features:
 * - Polls every 10 minutes (configurable)
 * - Fetches and parses JSON from R2 public URL
 * - Handles errors with retry logic
 * - Manages connection state (failure count, connected status)
 * - Continues polling after failures
 * 
 * @param r2Url - URL to fetch cost data from (defaults to R2_COST_URL)
 * @param interval - Polling interval in milliseconds (default: 600000 = 10 minutes)
 * @param maxFailures - Maximum consecutive failures before showing error (default: 3)
 * @returns Cost polling result with cost data, connection state, and control functions
 */
export function useCostPolling(
  r2Url: string = R2_COST_URL,
  interval: number = 600000, // 10 minutes in milliseconds
  maxFailures: number = 3
): UseCostPollingResult {
  // Current cost data (null if no successful fetch yet)
  const [costData, setCostData] = useState<CostData | null>(null);
  
  // Connection state with failure tracking
  const [connectionState, setConnectionState] = useState<ConnectionState>(defaultConnectionState);
  
  // Refs for managing polling lifecycle
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef<boolean>(false);
  
  /**
   * Fetch cost data from R2 and update state
   */
  const fetchCostData = useCallback(async () => {
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
      
      // Parse JSON response
      const data = await response.json();
      
      // Validate required fields
      if (typeof data.totalCost !== 'number' || typeof data.models !== 'object') {
        throw new Error('Invalid cost data format: missing required fields');
      }
      
      // Update cost data with parsed data
      setCostData(data);
      
      // Update connection state on success
      setConnectionState(_prev => ({
        connected: true,
        lastSuccessTime: Date.now(),
        failureCount: 0,
      }));
      
      console.log('[useCostPolling] Cost data updated:', data);
    } catch (error) {
      // Handle errors
      console.error('[useCostPolling] Fetch failed:', error);
      
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
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (isPollingRef.current) {
      return;
    }
    
    isPollingRef.current = true;
    
    // Initial fetch
    fetchCostData();
    
    // Set up interval for polling
    intervalIdRef.current = setInterval(fetchCostData, interval);
    
    console.log('[useCostPolling] Polling started');
  }, [fetchCostData, interval]);
  
  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    
    isPollingRef.current = false;
    console.log('[useCostPolling] Polling stopped');
  }, []);
  
  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    await fetchCostData();
  }, [fetchCostData]);
  
  // Set up polling on mount
  useEffect(() => {
    startPolling();
    
    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);
  
  return {
    costData,
    connectionState,
    refresh,
    startPolling,
    stopPolling,
  };
}
