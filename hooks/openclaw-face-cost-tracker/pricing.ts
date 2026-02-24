/**
 * Model pricing configuration
 * This module provides pricing data in a way that's compatible with different runtimes
 */

import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ModelPricing = {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
};

let pricingCache: Record<string, ModelPricing> | null = null;

export function getPricing(): Record<string, ModelPricing> {
  if (pricingCache) {
    return pricingCache;
  }

  try {
    // Try different methods to read the JSON file
    let pricingData: string;
    
    // Method 1: Direct file read (most compatible)
    try {
      pricingData = fs.readFileSync(path.join(__dirname, 'pricing.json'), 'utf-8');
    } catch (e) {
      // Method 2: Use URL (for ES modules)
      pricingData = fs.readFileSync(new URL('./pricing.json', import.meta.url), 'utf-8');
    }
    
    pricingCache = JSON.parse(pricingData) as Record<string, ModelPricing>;
    return pricingCache;
  } catch (error) {
    console.error('[openclaw-face-cost-tracker] Failed to load pricing.json:', error);
    pricingCache = {};
    return {};
  }
}
