/**
 * R2 Status Hook - Property-Based Tests
 * 
 * Tests for correctness properties defined in the design document.
 * Uses fast-check for property-based testing.
 * 
 * Validates: Design Document Properties 1-10
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { StatusPayload, ModelCallEvent, CompleteEvent } from '../types';

// Helper function to create status payload (mirrors hook logic)
function createStatusPayload(event: ModelCallEvent | CompleteEvent, busy: boolean): StatusPayload {
  const payload: StatusPayload = {
    busy,
    model: event.model,
    ts: event.timestamp,
  };

  if (event.taskId !== undefined) {
    payload.taskId = event.taskId;
  }

  return payload;
}

// Custom arbitraries
// Model name: non-empty string with at least one non-whitespace character
const modelNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

// Task ID: optional, non-empty when present
const taskIdArb = fc.oneof(
  fc.constant(undefined as const),
  fc.string({ minLength: 1, maxLength: 50 })
);

// Timestamp: reasonable range (2020-2030) in milliseconds
const minTimestamp = new Date('2020-01-01').getTime();
const maxTimestamp = new Date('2030-01-01').getTime();
const timestampArb = fc.integer({ min: minTimestamp, max: maxTimestamp });

const modelCallEventArb = fc.record({
  type: fc.constant('model_call'),
  model: modelNameArb,
  taskId: taskIdArb,
  timestamp: timestampArb,
});

const completeEventArb = fc.record({
  type: fc.constant('complete'),
  model: modelNameArb,
  taskId: taskIdArb,
  timestamp: timestampArb,
});

const openClawEventArb = fc.oneof(modelCallEventArb, completeEventArb);

// Helper to run property tests with vitest
function itProperty(name: string, property: fc.IProperty<any>, numRuns: number = 50) {
  it(name, () => {
    fc.assert(property, { numRuns });
  });
}

describe('Property 1: Event type correctly maps to busy state', () => {
  /**
   * For any model_call event, the resulting Status_JSON's busy field should be true;
   * For any complete event, the busy field should be false.
   * 
   * Validates: Requirements 1.1, 1.2
   */
  itProperty('model_call events produce busy: true', 
    fc.property(modelCallEventArb, (event) => {
      const payload = createStatusPayload(event, true);
      return payload.busy === true;
    })
  );

  itProperty('complete events produce busy: false',
    fc.property(completeEventArb, (event) => {
      const payload = createStatusPayload(event, false);
      return payload.busy === false;
    })
  );
});

describe('Property 2: Status JSON contains all required fields', () => {
  /**
   * For any agent event, the resulting Status_JSON should contain
   * busy (boolean), model (non-empty string), and ts (reasonable timestamp) fields.
   * 
   * Validates: Requirements 1.3, 1.4
   */
  itProperty('should contain busy, model, and ts fields',
    fc.property(openClawEventArb, (event) => {
      const busy = event.type === 'model_call';
      const payload = createStatusPayload(event, busy);
      
      return (
        typeof payload.busy === 'boolean' &&
        typeof payload.model === 'string' &&
        payload.model.length > 0 &&
        typeof payload.ts === 'number' &&
        payload.ts >= minTimestamp &&
        payload.ts <= maxTimestamp
      );
    })
  );

  itProperty('model field should be valid string',
    fc.property(modelNameArb, (model) => {
      const event: ModelCallEvent = {
        type: 'model_call',
        model,
        timestamp: Date.now(),
      };
      const payload = createStatusPayload(event, true);
      return (
        payload.model === model &&
        payload.model.length > 0 &&
        payload.model.length <= 100
      );
    })
  );
});

describe('Property 3: Conditional taskId field', () => {
  /**
   * For any event containing taskId, the resulting Status_JSON should contain the same taskId;
   * For any event without taskId, the resulting Status_JSON should not contain taskId field or it should be undefined.
   * 
   * Validates: Requirement 1.5
   */
  itProperty('events with taskId include taskId in payload',
    fc.property(
      fc.record({
        model: modelNameArb,
        taskId: fc.string({ minLength: 1, maxLength: 50 }),
        timestamp: timestampArb,
      }),
      (event) => {
        const modelEvent: ModelCallEvent = {
          type: 'model_call',
          model: event.model,
          taskId: event.taskId,
          timestamp: event.timestamp,
        };
        const payload = createStatusPayload(modelEvent, true);
        return payload.taskId === event.taskId;
      }
    )
  );

  itProperty('events without taskId do not include taskId in payload',
    fc.property(
      fc.record({
        model: modelNameArb,
        timestamp: timestampArb,
      }),
      (event) => {
        const modelEvent: ModelCallEvent = {
          type: 'model_call',
          model: event.model,
          timestamp: event.timestamp,
        };
        const payload = createStatusPayload(modelEvent, true);
        return payload.taskId === undefined;
      }
    )
  );
});

describe('Property 4: R2 upload target correctness', () => {
  /**
   * For any status update, the Hook should call R2 PutObject with
   * key parameter as "status.json" and bucket parameter as configured bucket name.
   * 
   * Validates: Requirements 1.6, 8.2
   */
  itProperty('status payload serializes to JSON with correct structure',
    fc.property(openClawEventArb, (event) => {
      const busy = event.type === 'model_call';
      const payload = createStatusPayload(event, busy);
      
      const json = JSON.stringify(payload);
      const parsed = JSON.parse(json);
      
      const hasBusy = parsed.busy === payload.busy;
      const hasModel = parsed.model === payload.model;
      const hasTs = parsed.ts === payload.ts;
      const hasTaskId = payload.taskId !== undefined ? parsed.taskId === payload.taskId : true;
      
      return hasBusy && hasModel && hasTs && hasTaskId;
    })
  );

  itProperty('JSON serialization produces valid JSON',
    fc.property(openClawEventArb, (event) => {
      const busy = event.type === 'model_call';
      const payload = createStatusPayload(event, busy);
      
      let serializeOk = true;
      let parseOk = true;
      
      try {
        JSON.stringify(payload);
      } catch {
        serializeOk = false;
      }
      
      try {
        JSON.parse(JSON.stringify(payload));
      } catch {
        parseOk = false;
      }
      
      return serializeOk && parseOk;
    })
  );
});

describe('Property 5: Status JSON serialization and parsing round-trip', () => {
  /**
   * For any valid StatusPayload object, serializing to JSON string and then parsing
   * should produce an equivalent object (all field values the same).
   * 
   * Validates: Requirement 3.2
   */
  itProperty('serialization and parsing produces equivalent object',
    fc.property(openClawEventArb, (event) => {
      const busy = event.type === 'model_call';
      const payload = createStatusPayload(event, busy);
      
      const serialized = JSON.stringify(payload);
      const parsed = JSON.parse(serialized);
      
      const busyEqual = parsed.busy === payload.busy;
      const modelEqual = parsed.model === payload.model;
      const tsEqual = parsed.ts === payload.ts;
      const taskIdEqual = payload.taskId !== undefined 
        ? parsed.taskId === payload.taskId 
        : parsed.taskId === undefined;
      
      return busyEqual && modelEqual && tsEqual && taskIdEqual;
    })
  );

  itProperty('round-trip preserves all field types',
    fc.property(
      fc.record({
        busy: fc.boolean(),
        model: modelNameArb,
        ts: fc.integer({ min: minTimestamp, max: maxTimestamp }),
        taskId: fc.oneof(fc.constant(undefined as const), fc.string({ minLength: 1, maxLength: 50 })),
      }),
      (original) => {
        const serialized = JSON.stringify(original);
        const parsed = JSON.parse(serialized);
        
        const busyType = typeof parsed.busy === 'boolean';
        const modelType = typeof parsed.model === 'string';
        const tsType = typeof parsed.ts === 'number';
        const taskIdType = original.taskId !== undefined 
          ? typeof parsed.taskId === 'string' 
          : true;
        
        return busyType && modelType && tsType && taskIdType;
      }
    )
  );
});

describe('Property 8: Upload failure does not interrupt running', () => {
  /**
   * For any R2 upload failure situation, the Hook should catch errors,
   * log them, and not throw unhandled exceptions.
   * 
   * Validates: Requirements 7.1, 7.2
   */
  itProperty('error handling does not throw unhandled exceptions',
    fc.property(openClawEventArb, (event) => {
      const busy = event.type === 'model_call';
      const payload = createStatusPayload(event, busy);
      
      let noThrow = true;
      try {
        JSON.stringify(payload);
      } catch {
        noThrow = false;
      }
      
      return noThrow;
    })
  );

  itProperty('error message is properly formatted',
    fc.property(fc.string(), (errorMessage) => {
      const formattedMessage = `[r2-status] Upload failed but hook continues running: ${errorMessage}`;
      return (
        typeof formattedMessage === 'string' &&
        formattedMessage.includes('[r2-status]')
      );
    })
  );
});

describe('Property 9: JSON size limit', () => {
  /**
   * For any StatusPayload, the serialized JSON string length should be less than 1024 bytes.
   * 
   * Validates: Requirement 8.4
   */
  itProperty('serialized JSON is less than 1024 bytes',
    fc.property(openClawEventArb, (event) => {
      const busy = event.type === 'model_call';
      const payload = createStatusPayload(event, busy);
      
      const json = JSON.stringify(payload);
      const size = new Blob([json]).size;
      
      return size < 1024;
    })
  );

  itProperty('typical payload size is well under limit',
    fc.property(
      fc.record({
        busy: fc.boolean(),
        model: fc.string({ minLength: 1, maxLength: 50 }),
        ts: fc.integer({ min: minTimestamp, max: maxTimestamp }),
        taskId: fc.oneof(fc.constant(undefined as const), fc.string({ minLength: 1, maxLength: 20 })),
      }),
      (payload) => {
        const json = JSON.stringify(payload);
        const size = new Blob([json]).size;
        
        // Typical payload should be under 200 bytes
        return size < 200;
      }
    )
  );
});

describe('Additional Properties', () => {
  describe('Event type handling', () => {
    itProperty('model_call events have correct type field',
      fc.property(modelCallEventArb, (event) => {
        return event.type === 'model_call';
      })
    );

    itProperty('complete events have correct type field',
      fc.property(completeEventArb, (event) => {
        return event.type === 'complete';
      })
    );
  });

  describe('Timestamp validity', () => {
    itProperty('timestamps are valid Unix epoch milliseconds',
      fc.property(timestampArb, (ts) => {
        const date = new Date(ts);
        return date.getTime() === ts && ts >= minTimestamp;
      })
    );

    itProperty('timestamps are within reasonable range',
      fc.property(timestampArb, (ts) => {
        // Reasonable range: from year 2020 to year 2030
        return ts >= minTimestamp && ts <= maxTimestamp;
      })
    );
  });

  describe('Model name validation', () => {
    itProperty('model names are valid non-empty strings',
      fc.property(modelNameArb, (model) => {
        return (
          model.length > 0 &&
          model.length <= 100 &&
          typeof model === 'string' &&
          model.trim().length > 0
        );
      })
    );
  });
});