import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateCost } from '../handler.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock console
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
};

// Mock pricing data for testing
const mockPricing = {
  'claude-sonnet-4-5-20251101': {
    input: 3.00,
    output: 15.00,
    cacheWrite: 3.75,
    cacheRead: 0.30
  },
  'unknown-model': {
    input: 1.00,
    output: 2.00,
    cacheWrite: 0,
    cacheRead: 0
  }
};

describe('calculateCost', () => {
  beforeEach(() => {
    // Load mock pricing for tests
    const pricingFile = path.join(os.tmpdir(), 'test-pricing.json');
    fs.writeFileSync(pricingFile, JSON.stringify(mockPricing));
    
    // Update the pricing file path in process env for testing
    process.env.HOME = os.tmpdir();
  });

  it('should calculate cost for Claude Sonnet 4.5', () => {
    const tokenBreakdown = {
      input: 1000,
      output: 500,
      cacheWrite: 100,
      cacheRead: 2000
    };
    
    const result = calculateCost(tokenBreakdown, 'claude-sonnet-4-5-20251101');
    
    expect(result.total).toBeCloseTo(0.011475, 5);
    expect(result.breakdown).toEqual({
      input: 0.003,      // 1000/1M * $3.00
      output: 0.0075,    // 500/1M * $15.00
      cacheWrite: 0.000375, // 100/1M * $3.75
      cacheRead: 0.0006  // 2000/1M * $0.30
    });
  });

  it('should return zero cost for unknown model', () => {
    const result = calculateCost({
      input: 1000,
      output: 500,
      cacheWrite: 100,
      cacheRead: 200
    }, 'non-existent-model');
    
    expect(result.total).toBe(0);
    expect(consoleSpy.error).toHaveBeenCalledWith(
      '[openclaw-face-cost-tracker] No pricing found for model: non-existent-model'
    );
  });

  it('should skip cost calculation for delivery-mirror model', () => {
    const result = calculateCost({
      input: 1000,
      output: 500,
      cacheWrite: 100,
      cacheRead: 200
    }, 'delivery-mirror');
    
    expect(result.total).toBe(0);
    expect(result.breakdown).toEqual({
      input: 0,
      output: 0,
      cacheWrite: 0,
      cacheRead: 0
    });
    expect(consoleSpy.log).toHaveBeenCalledWith(
      '[openclaw-face-cost-tracker] Skipping cost calculation for internal model: delivery-mirror'
    );
  });

  it('should handle zero tokens', () => {
    const tokenBreakdown = {
      input: 0,
      output: 0,
      cacheWrite: 0,
      cacheRead: 0
    };
    
    const result = calculateCost(tokenBreakdown, 'claude-sonnet-4-5-20251101');
    
    expect(result.total).toBe(0);
    expect(Object.values(result.breakdown)).toEqual(expect.arrayContaining([0, 0, 0, 0]));
  });
});
