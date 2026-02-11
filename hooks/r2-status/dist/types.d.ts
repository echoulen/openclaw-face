/**
 * R2 Status Hook - Type Definitions
 *
 * Core types for OpenClaw Face status monitoring system.
 */
/**
 * Status payload sent to R2 storage
 */
export interface StatusPayload {
    /** Whether the agent is currently busy processing a task */
    busy: boolean;
    /** The name of the model currently being used */
    model: string;
    /** Unix timestamp in milliseconds */
    ts: number;
    /** Optional task identifier */
    taskId?: string;
}
/**
 * Connection state for polling status
 */
export interface ConnectionState {
    /** Whether the connection is currently successful */
    connected: boolean;
    /** Timestamp of the last successful connection (Unix ms) */
    lastSuccessTime: number;
    /** Number of consecutive failures */
    failureCount: number;
}
/**
 * R2 configuration interface
 */
export interface R2Config {
    /** R2 access key ID */
    R2_ACCESS_KEY_ID: string;
    /** R2 secret access key */
    R2_SECRET_ACCESS_KEY: string;
    /** R2 endpoint URL */
    R2_ENDPOINT: string;
    /** R2 bucket name */
    R2_BUCKET: string;
}
/**
 * Hook configuration interface
 */
export interface HookConfig {
    /** R2 configuration */
    r2: R2Config;
    /** Upload timeout in milliseconds */
    uploadTimeout: number;
}
/**
 * Default upload timeout (5 seconds)
 */
export declare const DEFAULT_UPLOAD_TIMEOUT = 5000;
/**
 * Status JSON key in R2 bucket
 */
export declare const STATUS_JSON_KEY = "status.json";
/**
 * Validates a StatusPayload object
 * @param payload - The payload to validate
 * @returns true if the payload is valid
 */
export declare function isValidStatusPayload(payload: unknown): payload is StatusPayload;
/**
 * Validates a ConnectionState object
 * @param state - The state to validate
 * @returns true if the state is valid
 */
export declare function isValidConnectionState(state: unknown): state is ConnectionState;
//# sourceMappingURL=types.d.ts.map