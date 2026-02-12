/**
 * R2 Status Hook - Configuration Management Module
 * 
 * Reads R2 configuration from environment variables and validates
 * required configuration values.
 */

import { R2Config } from './types';

/**
 * Required environment variable names for R2 configuration
 */
const REQUIRED_ENV_VARS = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'R2_BUCKET',
] as const;

/**
 * Environment variable names that are optional
 */
const OPTIONAL_ENV_VARS: string[] = [];

/**
 * Error class for configuration validation failures
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Validates that all required environment variables are present
 * @throws ConfigurationError if any required environment variable is missing
 */
function validateEnvironmentVariables(): void {
  const missingVars: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new ConfigurationError(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

/**
 * Reads R2 configuration from environment variables
 * 
 * @returns Type-safe R2Config object
 * @throws ConfigurationError if required environment variables are missing
 * 
 * @example
 * ```typescript
 * const config = loadConfig();
 * console.log(config.R2_BUCKET); // "openclaw-status-user"
 * ```
 */
export function loadConfig(): R2Config {
  // Validate required environment variables
  validateEnvironmentVariables();

  // Build and return the configuration object
  const config: R2Config = {
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
    R2_ENDPOINT: process.env.R2_ENDPOINT!,
    R2_BUCKET: process.env.R2_BUCKET!,
  };

  return config;
}

/**
 * Checks if the hook is properly configured
 * 
 * @returns true if all required environment variables are present
 */
export function isConfigured(): boolean {
  try {
    validateEnvironmentVariables();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets a human-readable list of missing environment variables
 * 
 * @returns Array of missing variable names, empty if none missing
 */
export function getMissingEnvironmentVariables(): string[] {
  const missingVars: string[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  return missingVars;
}