import { describe, expect, it } from 'vitest';
import { parseJsonc } from './jsonc.js';

describe('parseJsonc', () => {
  it('parses valid JSONC with comments and trailing commas', () => {
    const result = parseJsonc('{\n  // comment\n  "a": 1,\n}\n');
    expect(result.errors).toEqual([]);
    expect(result.value).toEqual({ a: 1 });
  });

  it('reports the line number of a syntax error', () => {
    const text = '{\n  "a": 1\n  "b": 2\n}\n';
    const result = parseJsonc(text);
    expect(result.value).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.line).toBe(3);
  });
});
