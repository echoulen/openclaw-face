/**
 * OpenClaw Face - Type Definitions
 */

/**
 * Agent status from R2 status.json
 */
export interface AgentStatus {
  busy: boolean;
  ts: number;
  sessionKey?: string;
  source?: string;
}

/**
 * Connection state for polling
 */
export interface ConnectionState {
  connected: boolean;
  lastSuccessTime: number;
  failureCount: number;
}

/**
 * Default connection state
 */
export const defaultConnectionState: ConnectionState = {
  connected: true,
  lastSuccessTime: 0,
  failureCount: 0,
};

/**
 * Heartbeat animation states
 */
export type HeartbeatState = 'idle' | 'busy' | 'disconnected';

/**
 * Animation configuration
 */
export interface AnimationConfig {
  canvasWidth: number;
  canvasHeight: number;
  idleColor: string;
  busyColor: string;
  disconnectedColor: string;
  transitionDuration: number;
}

/**
 * Default animation configuration
 */
export const defaultAnimationConfig: AnimationConfig = {
  canvasWidth: 400,
  canvasHeight: 200,
  idleColor: 'rgb(76, 175, 80)',
  busyColor: 'rgb(244, 67, 54)',
  disconnectedColor: 'rgb(158, 158, 158)',
  transitionDuration: 1000,
};

/**
 * Polling configuration
 */
export interface PollingConfig {
  interval: number;
  timeout: number;
  maxFailures: number;
}

/**
 * Default polling configuration
 */
export const defaultPollingConfig: PollingConfig = {
  interval: 5000,
  timeout: 5000,
  maxFailures: 3,
};

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  r2Url: string;
  polling: PollingConfig;
  animation: AnimationConfig;
}

/**
 * Default dashboard configuration
 */
export const defaultDashboardConfig: DashboardConfig = {
  r2Url: 'https://example.com/status.json',
  polling: defaultPollingConfig,
  animation: defaultAnimationConfig,
};