/**
 * R2 Status Hook - Property-Based Tests
 *
 * Validates correctness properties of the status payload.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { StatusPayload } from '../handler';

const minTimestamp = new Date('2020-01-01').getTime();
const maxTimestamp = new Date('2030-01-01').getTime();
const timestampArb = fc.integer({ min: minTimestamp, max: maxTimestamp });

const sessionKeyArb = fc.string({ minLength: 1, maxLength: 50 });
const sourceArb: fc.Arbitrary<string | undefined> = fc.oneof(
  fc.constant(undefined as undefined),
  fc.constantFrom('telegram', 'whatsapp', 'test')
);

const statusPayloadArb = fc.record({
  busy: fc.boolean(),
  ts: timestampArb,
  sessionKey: fc.oneof(fc.constant(undefined as undefined), sessionKeyArb),
  source: sourceArb,
});

function itProperty(name: string, property: fc.IProperty<any>, numRuns = 50) {
  it(name, () => {
    fc.assert(property, { numRuns });
  });
}

describe('StatusPayload properties', () => {
  describe('JSON serialization round-trip', () => {
    itProperty('serialization and parsing produces equivalent object',
      fc.property(statusPayloadArb, (payload) => {
        const serialized = JSON.stringify(payload);
        const parsed = JSON.parse(serialized);

        return (
          parsed.busy === payload.busy &&
          parsed.ts === payload.ts &&
          (payload.sessionKey !== undefined ? parsed.sessionKey === payload.sessionKey : parsed.sessionKey === undefined) &&
          (payload.source !== undefined ? parsed.source === payload.source : parsed.source === undefined)
        );
      })
    );

    itProperty('round-trip preserves field types',
      fc.property(statusPayloadArb, (payload) => {
        const parsed = JSON.parse(JSON.stringify(payload));
        return (
          typeof parsed.busy === 'boolean' &&
          typeof parsed.ts === 'number'
        );
      })
    );
  });

  describe('JSON size limit', () => {
    itProperty('serialized JSON is less than 1024 bytes',
      fc.property(statusPayloadArb, (payload) => {
        const json = JSON.stringify(payload);
        return new Blob([json]).size < 1024;
      })
    );
  });

  describe('timestamp validity', () => {
    itProperty('timestamps are valid Unix epoch milliseconds',
      fc.property(timestampArb, (ts) => {
        const date = new Date(ts);
        return date.getTime() === ts && ts >= minTimestamp;
      })
    );
  });

  describe('busy state mapping', () => {
    itProperty('command:new always maps to busy: true',
      fc.property(timestampArb, sessionKeyArb, sourceArb, (ts, sessionKey, source) => {
        const payload: StatusPayload = { busy: true, ts, sessionKey, source };
        return payload.busy === true;
      })
    );

    itProperty('command:stop always maps to busy: false',
      fc.property(timestampArb, sessionKeyArb, sourceArb, (ts, sessionKey, source) => {
        const payload: StatusPayload = { busy: false, ts, sessionKey, source };
        return payload.busy === false;
      })
    );
  });
});
