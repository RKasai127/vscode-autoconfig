import { describe, expect, it } from 'vitest';
import { aggregate } from './aggregate.js';
import type { Rule } from './types.js';

describe('aggregate', () => {
  it('merges settings and extensions from all matched rules', () => {
    const rules: Rule[] = [
      { id: 'a', when: {}, settings: { 'a.key': 1 }, extensions: ['foo.bar'] },
      { id: 'b', when: {}, settings: { 'b.key': 2 }, extensions: ['baz.qux'] },
    ];

    const result = aggregate(rules);

    expect(result.settings).toEqual({ 'a.key': 1, 'b.key': 2 });
    expect(result.extensions).toEqual(['baz.qux', 'foo.bar']);
    expect(result.matchedRuleIds).toEqual(['a', 'b']);
    expect(result.conflicts).toEqual([]);
  });

  it('dedupes extensions case-insensitively, keeping the first-seen casing', () => {
    const rules: Rule[] = [
      { id: 'a', when: {}, extensions: ['Foo.Bar'] },
      { id: 'b', when: {}, extensions: ['foo.bar'] },
    ];

    const result = aggregate(rules);

    expect(result.extensions).toEqual(['Foo.Bar']);
  });

  it('applies first-wins and records a conflict when rules disagree on a settings value', () => {
    const rules: Rule[] = [
      { id: 'first', when: {}, settings: { 'x.y': 'alpha' } },
      { id: 'second', when: {}, settings: { 'x.y': 'beta' } },
    ];

    const result = aggregate(rules);

    expect(result.settings['x.y']).toBe('alpha');
    expect(result.conflicts).toEqual([
      { key: 'x.y', winningRuleId: 'first', ignoredRuleIds: ['second'] },
    ]);
  });

  it('does not record a conflict when rules agree on the same value', () => {
    const rules: Rule[] = [
      { id: 'first', when: {}, settings: { 'x.y': 'alpha' } },
      { id: 'second', when: {}, settings: { 'x.y': 'alpha' } },
    ];

    const result = aggregate(rules);

    expect(result.conflicts).toEqual([]);
  });

  it('accumulates multiple ignored rule ids for the same conflicting key', () => {
    const rules: Rule[] = [
      { id: 'first', when: {}, settings: { 'x.y': 'alpha' } },
      { id: 'second', when: {}, settings: { 'x.y': 'beta' } },
      { id: 'third', when: {}, settings: { 'x.y': 'gamma' } },
    ];

    const result = aggregate(rules);

    expect(result.conflicts).toEqual([
      { key: 'x.y', winningRuleId: 'first', ignoredRuleIds: ['second', 'third'] },
    ]);
  });

  it('merges two rules that both target the same ordinary object-valued key at one level', () => {
    const rules: Rule[] = [
      { id: 'first', when: {}, settings: { 'files.exclude': { '**/.git': true } } },
      { id: 'second', when: {}, settings: { 'files.exclude': { '**/node_modules': true } } },
    ];

    const result = aggregate(rules);

    expect(result.settings['files.exclude']).toEqual({ '**/.git': true, '**/node_modules': true });
    expect(result.conflicts).toEqual([]);
  });

  it('merges two rules that both target the same language-override key two levels deep', () => {
    const rules: Rule[] = [
      {
        id: 'black',
        when: {},
        settings: { '[python]': { 'editor.defaultFormatter': 'ms-python.black-formatter' } },
      },
      {
        id: 'ruff',
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
    const rules: Rule[] = [{ id: 'black', when: {}, settings: { '[python]': pythonSettings } }];
    const other: Rule = {
      id: 'ruff',
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
