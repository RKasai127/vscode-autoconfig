import { describe, expect, it } from 'vitest';
import { aggregate } from '../core/aggregate.js';
import { evaluateRules } from '../core/engine.js';
import type { Finding } from '../core/types.js';
import { loadBuiltinRules } from './loader.js';

const rules = loadBuiltinRules();

describe('builtin rule table', () => {
  it('has no duplicate rule ids', () => {
    const ids = rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every rule condition is structurally satisfiable', () => {
    // A rule that can never match any finding would be dead weight; walk each
    // rule's `when` tree and synthesize findings from every leaf matcher, then
    // confirm the rule fires against that synthetic finding set.
    for (const rule of rules) {
      const findings = leafFindingsOf(rule.when);
      expect(findings.length, `rule "${rule.id}" has no leaf matchers`).toBeGreaterThan(0);
      for (const finding of findings) {
        expect(
          evaluateRules([finding], [rule]).map((r) => r.id),
          `rule "${rule.id}" did not match its own synthesized finding ${JSON.stringify(finding)}`,
        ).toContain(rule.id);
      }
    }
  });
});

describe('node rule content', () => {
  const tsFinding: Finding = { ecosystem: 'node', kind: 'devDependency', name: 'typescript' };
  const eslintConfigFinding: Finding = {
    ecosystem: 'node',
    kind: 'configFilePresence',
    name: '.eslintrc.json',
  };
  const prettierDepFinding: Finding = {
    ecosystem: 'node',
    kind: 'devDependency',
    name: 'prettier',
  };
  const reactFinding: Finding = { ecosystem: 'node', kind: 'dependency', name: 'react' };
  const vueFinding: Finding = { ecosystem: 'node', kind: 'dependency', name: 'vue' };
  const nextFinding: Finding = { ecosystem: 'node', kind: 'dependency', name: 'next' };
  const tailwindFinding: Finding = { ecosystem: 'node', kind: 'dependency', name: 'tailwindcss' };

  it('recommends typescript.tsdk and eslint extension for a TypeScript project', () => {
    const result = aggregate(evaluateRules([tsFinding], rules));
    expect(result.settings['js/ts.tsdk.path']).toBe('./node_modules/typescript/lib');
    expect(result.extensions).toContain('dbaeumer.vscode-eslint');
  });

  it('recommends eslint settings and extension when an eslint config is present', () => {
    const result = aggregate(evaluateRules([eslintConfigFinding], rules));
    expect(result.settings['eslint.enable']).toBe(true);
    expect(result.settings['editor.codeActionsOnSave']).toEqual({
      'source.fixAll.eslint': 'explicit',
    });
    expect(result.extensions).toContain('dbaeumer.vscode-eslint');
  });

  it('recommends prettier formatter setting and extension when prettier is a devDependency', () => {
    const result = aggregate(evaluateRules([prettierDepFinding], rules));
    expect(result.settings['editor.defaultFormatter']).toBe('esbenp.prettier-vscode');
    expect(result.extensions).toContain('esbenp.prettier-vscode');
  });

  it.each([
    [reactFinding, 'dsznajder.es7-react-js-snippets'],
    [vueFinding, 'Vue.volar'],
    [nextFinding, 'dsznajder.es7-react-js-snippets'],
    [tailwindFinding, 'bradlc.vscode-tailwindcss'],
  ])('recommends the matching extension for %o', (finding, extensionId) => {
    const result = aggregate(evaluateRules([finding as Finding], rules));
    expect(result.extensions).toContain(extensionId);
  });
});

describe('python rule content', () => {
  const requirementsFinding: Finding = {
    ecosystem: 'python',
    kind: 'manifestPresence',
    name: 'requirements.txt',
  };
  const blackFinding: Finding = { ecosystem: 'python', kind: 'dependency', name: 'black' };
  const ruffFinding: Finding = { ecosystem: 'python', kind: 'devDependency', name: 'ruff' };
  const mypyFinding: Finding = { ecosystem: 'python', kind: 'dependency', name: 'mypy' };

  it('recommends the Python extension pack when a manifest is present', () => {
    const result = aggregate(evaluateRules([requirementsFinding], rules));
    expect(result.extensions).toEqual(
      expect.arrayContaining(['ms-python.python', 'ms-python.vscode-pylance']),
    );
  });

  it('recommends black formatter settings nested under "[python]"', () => {
    const result = aggregate(evaluateRules([blackFinding], rules));
    expect(result.settings['[python]']).toEqual({
      'editor.defaultFormatter': 'ms-python.black-formatter',
      'editor.formatOnSave': true,
    });
    expect(result.extensions).toContain('ms-python.black-formatter');
  });

  it('recommends ruff code-actions-on-save nested under "[python]"', () => {
    const result = aggregate(evaluateRules([ruffFinding], rules));
    expect(result.settings['[python]']).toEqual({
      'editor.codeActionsOnSave': { 'source.fixAll.ruff': true },
    });
    expect(result.extensions).toContain('charliermarsh.ruff');
  });

  it('recommends mypy extension for a mypy dependency', () => {
    const result = aggregate(evaluateRules([mypyFinding], rules));
    expect(result.extensions).toContain('ms-python.mypy-type-checker');
  });

  it('merges black and ruff settings under the same "[python]" key without dropping either', () => {
    const result = aggregate(evaluateRules([blackFinding, ruffFinding], rules));
    expect(result.conflicts).toEqual([]);
    expect(result.settings['[python]']).toEqual({
      'editor.defaultFormatter': 'ms-python.black-formatter',
      'editor.formatOnSave': true,
      'editor.codeActionsOnSave': { 'source.fixAll.ruff': true },
    });
  });
});

// --- helpers ---

import type { RuleCondition, FindingMatcher } from '../core/types.js';

function isLeafMatcher(condition: RuleCondition): condition is FindingMatcher {
  return !('all' in condition) && !('any' in condition) && !('not' in condition);
}

function leafFindingsOf(condition: RuleCondition): Finding[] {
  if ('all' in condition) return condition.all.flatMap(leafFindingsOf);
  if ('any' in condition) return condition.any.flatMap(leafFindingsOf);
  if ('not' in condition) return leafFindingsOf(condition.not);
  if (isLeafMatcher(condition)) {
    return [
      {
        ecosystem: condition.ecosystem ?? 'node',
        kind: condition.kind ?? 'dependency',
        name: condition.name ?? 'placeholder',
      },
    ];
  }
  return [];
}
