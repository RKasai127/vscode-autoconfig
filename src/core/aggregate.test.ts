import { describe, expect, it } from 'vitest';
import { aggregate } from './aggregate.js';
import type { Rule } from './types.js';

describe('aggregate', () => {
  it('merges settings and extensions from all matched rules', () => {
    const rules: Rule[] = [
      {
        id: 'python-manifest-presence',
        when: {},
        settings: { 'python.defaultInterpreterPath': '${workspaceFolder}/.venv/bin/python' },
        extensions: ['ms-python.python'],
      },
      {
        id: 'node-eslint-config-presence',
        when: {},
        settings: { 'eslint.enable': true },
        extensions: ['dbaeumer.vscode-eslint'],
      },
    ];

    const result = aggregate(rules);

    expect(result.settings).toEqual({
      'python.defaultInterpreterPath': '${workspaceFolder}/.venv/bin/python',
      'eslint.enable': true,
    });
    expect(result.extensions).toEqual(['dbaeumer.vscode-eslint', 'ms-python.python']);
    expect(result.matchedRuleIds).toEqual(['python-manifest-presence', 'node-eslint-config-presence']);
    expect(result.conflicts).toEqual([]);
  });

  it('dedupes extensions case-insensitively, keeping the first-seen casing', () => {
    const rules: Rule[] = [
      { id: 'python-manifest-presence', when: {}, extensions: ['Ms-Python.Python'] },
      { id: 'python-mypy-dependency', when: {}, extensions: ['ms-python.python'] },
    ];

    const result = aggregate(rules);

    expect(result.extensions).toEqual(['Ms-Python.Python']);
  });

  it('applies first-wins and records a conflict when rules disagree on a settings value', () => {
    const rules: Rule[] = [
      {
        id: 'python-black-dependency',
        when: {},
        settings: { 'editor.defaultFormatter': 'ms-python.black-formatter' },
      },
      {
        id: 'python-autopep8-dependency',
        when: {},
        settings: { 'editor.defaultFormatter': 'ms-python.autopep8' },
      },
    ];

    const result = aggregate(rules);

    expect(result.settings['editor.defaultFormatter']).toBe('ms-python.black-formatter');
    expect(result.conflicts).toEqual([
      {
        key: 'editor.defaultFormatter',
        winningRuleId: 'python-black-dependency',
        ignoredRuleIds: ['python-autopep8-dependency'],
      },
    ]);
  });

  it('does not record a conflict when rules agree on the same value', () => {
    const rules: Rule[] = [
      {
        id: 'python-black-dependency',
        when: {},
        settings: { 'editor.defaultFormatter': 'ms-python.black-formatter' },
      },
      {
        id: 'python-manifest-presence',
        when: {},
        settings: { 'editor.defaultFormatter': 'ms-python.black-formatter' },
      },
    ];

    const result = aggregate(rules);

    expect(result.conflicts).toEqual([]);
  });

  it('accumulates multiple ignored rule ids for the same conflicting key', () => {
    const rules: Rule[] = [
      {
        id: 'node-prettier-config-presence',
        when: {},
        settings: { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },
      },
      {
        id: 'node-biome-config-presence',
        when: {},
        settings: { 'editor.defaultFormatter': 'biomejs.biome' },
      },
      {
        id: 'node-eslint-config-presence',
        when: {},
        settings: { 'editor.defaultFormatter': 'dbaeumer.vscode-eslint' },
      },
    ];

    const result = aggregate(rules);

    expect(result.conflicts).toEqual([
      {
        key: 'editor.defaultFormatter',
        winningRuleId: 'node-prettier-config-presence',
        ignoredRuleIds: ['node-biome-config-presence', 'node-eslint-config-presence'],
      },
    ]);
  });

  it('merges two rules that both target the same ordinary object-valued key at one level', () => {
    const rules: Rule[] = [
      { id: 'node-typescript-presence', when: {}, settings: { 'files.exclude': { '**/node_modules': true } } },
      { id: 'python-manifest-presence', when: {}, settings: { 'files.exclude': { '**/__pycache__': true } } },
    ];

    const result = aggregate(rules);

    expect(result.settings['files.exclude']).toEqual({
      '**/node_modules': true,
      '**/__pycache__': true,
    });
    expect(result.conflicts).toEqual([]);
  });

  it('merges two rules that both target the same language-override key two levels deep', () => {
    const rules: Rule[] = [
      {
        id: 'python-black-dependency',
        when: {},
        settings: { '[python]': { 'editor.defaultFormatter': 'ms-python.black-formatter' } },
      },
      {
        id: 'python-ruff-dependency',
        when: {},
        settings: { '[python]': { 'editor.codeActionsOnSave': { 'source.fixAll.ruff': true } } },
      },
    ];

    const result = aggregate(rules);

    expect(result.settings['[python]']).toEqual({
      'editor.defaultFormatter': 'ms-python.black-formatter',
      'editor.codeActionsOnSave': { 'source.fixAll.ruff': true },
    });
    expect(result.conflicts).toEqual([]);
  });

  it('does not mutate the original rule.settings object literals across repeated aggregation', () => {
    const pythonSettings = { 'editor.defaultFormatter': 'ms-python.black-formatter' };
    const rules: Rule[] = [
      { id: 'python-black-dependency', when: {}, settings: { '[python]': pythonSettings } },
    ];
    const other: Rule = {
      id: 'python-ruff-dependency',
      when: {},
      settings: { '[python]': { 'editor.codeActionsOnSave': { 'source.fixAll.ruff': true } } },
    };

    aggregate([...rules, other]);

    // the source rule literal must remain untouched by the merge performed above
    expect(pythonSettings).toEqual({ 'editor.defaultFormatter': 'ms-python.black-formatter' });

    // a second, independent aggregation using the same rule objects must not
    // see leftovers from the previous call
    const secondResult = aggregate(rules);
    expect(secondResult.settings['[python]']).toEqual({
      'editor.defaultFormatter': 'ms-python.black-formatter',
    });
  });
});
