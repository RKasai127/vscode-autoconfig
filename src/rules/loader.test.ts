import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  loadBuiltinRules,
  loadExternalRules,
  loadRules,
  RuleFileValidationError,
} from './loader.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../tests/fixtures/rules');

describe('loadBuiltinRules', () => {
  it('returns a flat array of rules without throwing', () => {
    const builtinRules = loadBuiltinRules();

    expect(Array.isArray(builtinRules)).toBe(true);
    expect(builtinRules.length).toBe(11); // Seven Node rules and four Python rules.
  });
});

describe('external rule loading', () => {
  it('loads and validates a JSON rule file', () => {
    const rules = loadExternalRules(join(fixturesDir, 'valid.json'));

    expect(rules).toEqual([
      { id: 'custom-rule', when: { ecosystem: 'node' }, extensions: ['foo.bar'] },
    ]);
  });

  it('loads and validates a YAML rule file', () => {
    const rules = loadExternalRules(join(fixturesDir, 'valid.yaml'));

    expect(rules).toEqual([{ id: 'yaml-rule', when: { ecosystem: 'python' } }]);
  });

  it('throws a RuleFileValidationError for an invalid rule file', () => {
    const path = join(fixturesDir, 'invalid-schema-version.json');

    expect(() => loadExternalRules(path)).toThrow(RuleFileValidationError);
  });

  it('merges builtin and external rules by default', () => {
    const path = join(fixturesDir, 'valid.json');
    const builtinCount = loadBuiltinRules().length;
    const merged = loadRules({ externalPath: path });

    expect(merged.length).toBe(builtinCount + 1);
    expect(merged.some((r) => r.id === 'custom-rule')).toBe(true);
  });

  it('uses only external rules when useBuiltinRules is false', () => {
    const path = join(fixturesDir, 'valid.json');
    const merged = loadRules({ externalPath: path, useBuiltinRules: false });

    expect(merged).toEqual([
      { id: 'custom-rule', when: { ecosystem: 'node' }, extensions: ['foo.bar'] },
    ]);
  });

  it('throws a RuleFileValidationError when an external rule reuses a built-in rule id', () => {
    const path = join(fixturesDir, 'duplicate-builtin-id.json');

    expect(() => loadRules({ externalPath: path })).toThrow(RuleFileValidationError);
    expect(() => loadRules({ externalPath: path })).toThrow(/node-eslint-config-presence/);
  });

  it('does not throw for a reused id when useBuiltinRules is false', () => {
    const path = join(fixturesDir, 'duplicate-builtin-id.json');

    const rules = loadRules({externalPath: path, useBuiltinRules: false})
  
    expect(rules).toEqual([{
      "id": "node-eslint-config-presence",
      "when": { "ecosystem": "node", "kind": "devDependency", "name": "eslint" },
      "settings": { "eslint.enable": false }
    }])
  });
});
