"use strict";
/**
 * R2 Status Hook - Type Definitions
 *
 * Core types for OpenClaw Face status monitoring system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_JSON_KEY = exports.DEFAULT_UPLOAD_TIMEOUT = void 0;
exports.isValidStatusPayload = isValidStatusPayload;
exports.isValidConnectionState = isValidConnectionState;
/**
 * Default upload timeout (5 seconds)
 */
exports.DEFAULT_UPLOAD_TIMEOUT = 5000;
/**
 * Status JSON key in R2 bucket
 */
exports.STATUS_JSON_KEY = 'status.json';
/**
 * Validates a StatusPayload object
 * @param payload - The payload to validate
 * @returns true if the payload is valid
 */
function isValidStatusPayload(payload) {
    if (typeof payload !== 'object' || payload === null) {
        return false;
    }
    const p = payload;
    if (typeof p.busy !== 'boolean') {
        return false;
    }
    if (typeof p.model !== 'string' || p.model.length === 0 || p.model.length > 100) {
        return false;
    }
    if (typeof p.ts !== 'number' || !Number.isInteger(p.ts) || p.ts <= 0) {
        return false;
    }
    if (p.taskId !== undefined && (typeof p.taskId !== 'string' || p.taskId.length === 0)) {
        return false;
    }
    return true;
}
/**
 * Validates a ConnectionState object
 * @param state - The state to validate
 * @returns true if the state is valid
 */
function isValidConnectionState(state) {
    if (typeof state !== 'object' || state === null) {
        return false;
    }
    const s = state;
    if (typeof s.connected !== 'boolean') {
        return false;
    }
    if (typeof s.lastSuccessTime !== 'number' || !Number.isInteger(s.lastSuccessTime) || s.lastSuccessTime < 0) {
        return false;
    }
    if (typeof s.failureCount !== 'number' || !Number.isInteger(s.failureCount) || s.failureCount < 0) {
        return false;
    }
    return true;
}
//# sourceMappingURL=types.js.map