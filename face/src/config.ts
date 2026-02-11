/**
 * OpenClaw Face - Configuration
 * R2 public URL and environment configuration
 */

// R2 public URL for status polling
// This should be the public URL of the status.json file in your R2 bucket
// Format: https://<account-id>.r2.cloudflarestorage.com/<bucket-name>/status.json
export const R2_PUBLIC_URL: string = 
  (import.meta as { env?: { VITE_R2_PUBLIC_URL?: string } }).env?.VITE_R2_PUBLIC_URL || 
  'https://example.com/openclaw-status/default/status.json';