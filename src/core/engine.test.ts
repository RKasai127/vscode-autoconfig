import { describe, expect, it } from 'vitest';
import { evaluateRules, matchesCondition } from './engine.js';
import type { Rule, Finding } from './types.js';

const tsFinding: Finding = { ecosystem: 'node', kind: 'devDependency', name: 'typescript' };
const reactFinding: Finding = { ecosystem: 'node', kind: 'dependency', name: 'react' };
const pyFinding: Finding = {
  ecosystem: 'python',
  kind: 'manifestPresence',
  name: 'requirements.txt',
};

describe('matchesCondition', () => {
  it('matches a leaf matcher when a finding satisfies all specified fields', () => {
    expect(
      matchesCondition({ ecosystem: 'node', kind: 'devDependency', name: 'typescript' }, [
        tsFinding,
      ]),
    ).toBe(true);
  });

  it('does not match a leaf matcher when no finding satisfies it', () => {
    expect(
      matchesCondition({ ecosystem: 'node', kind: 'dependency', name: 'typescript' }, [tsFinding]),
    ).toBe(false);
  });

  it('matches partial matchers (only fields specified are checked)', () => {
    expect(matchesCondition({ ecosystem: 'node' }, [tsFinding])).toBe(true);
    expect(matchesCondition({ ecosystem: 'python' }, [tsFinding])).toBe(false);
  });

  it('combines conditions with any', () => {
    const condition = { any: [{ name: 'typescript' }, { name: 'nonexistent' }] };
    expect(matchesCondition(condition, [tsFinding])).toBe(true);
  });

  it('combines conditions with all', () => {
    const condition = { all: [{ ecosystem: 'node' as const }, { name: 'react' }] };
    expect(matchesCondition(condition, [tsFinding, reactFinding])).toBe(true);
    expect(matchesCondition(condition, [tsFinding])).toBe(false);
  });

  it('negates a condition with not', () => {
    expect(matchesCondition({ not: { ecosystem: 'python' as const } }, [tsFinding])).toBe(true);
    expect(matchesCondition({ not: { ecosystem: 'node' as const } }, [tsFinding])).toBe(false);
  });

  it('supports nested boolean combinators', () => {
    const condition = {
      any: [
        { all: [{ ecosystem: 'node' as const }, { name: 'react' }] },
        { ecosystem: 'python' as const },
      ],
    };
    expect(matchesCondition(condition, [pyFinding])).toBe(true);
    expect(matchesCondition(condition, [tsFinding])).toBe(false);
  });
});

describe('evaluateRules', () => {
  it('returns only rules whose condition is satisfied by the given findings', () => {
    const rules: Rule[] = [
      { id: 'ts-rule', when: { name: 'typescript' } },
      { id: 'react-rule', when: { name: 'react' } },
      { id: 'py-rule', when: { ecosystem: 'python' } },
    ];
    const matched = evaluateRules([tsFinding, reactFinding], rules);
    expect(matched.map((r) => r.id)).toEqual(['ts-rule', 'react-rule']);
  });

  it('preserves rule definition order in the result', () => {
    const rules: Rule[] = [
      { id: 'node-eslint-config-presence', when: { ecosystem: 'node' } },
      { id: 'node-prettier-config-presence', when: { ecosystem: 'node' } },
    ];
    const matched = evaluateRules([tsFinding], rules);
    expect(matched.map((r) => r.id)).toEqual([
      'node-eslint-config-presence',
      'node-prettier-config-presence',
    ]);
  });
});
