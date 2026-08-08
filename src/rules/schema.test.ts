import { describe, expect, it } from 'vitest';
import { ruleFileSchema } from './schema.js';

describe('ruleFileSchema', () => {
  it('accepts a well-formed rule file', () => {
    const result = ruleFileSchema.safeParse({
      schemaVersion: 1,
      rules: [
        {
          id: 'node-typescript-presence',
          when: { any: [{ ecosystem: 'node', kind: 'devDependency', name: 'typescript' }] },
          settings: { 'typescript.tsdk': 'node_modules/typescript/lib' },
          extensions: ['dbaeumer.vscode-eslint'],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unsupported schemaVersion with a descriptive message', () => {
    const result = ruleFileSchema.safeParse({ schemaVersion: 2, rules: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('schemaVersion 2');
    }
  });

  it('rejects duplicate rule ids', () => {
    const rule = { id: 'dup', when: { ecosystem: 'node' } };
    const result = ruleFileSchema.safeParse({ schemaVersion: 1, rules: [rule, rule] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('duplicated'))).toBe(true);
    }
  });

  it('rejects a rule with an unrecognized condition shape', () => {
    const result = ruleFileSchema.safeParse({
      schemaVersion: 1,
      rules: [{ id: 'bad', when: { unknownKey: true } }],
    });
    expect(result.success).toBe(false);
  });
});
