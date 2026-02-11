import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock fetch API for Node.js environment
declare const global: {
  fetch: typeof fetch;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (id: number) => void;
};

global.fetch = vi.fn() as unknown as typeof fetch;

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback): number => 
  window.setTimeout(callback, 16);
global.cancelAnimationFrame = (id: number): void => window.clearTimeout(id);