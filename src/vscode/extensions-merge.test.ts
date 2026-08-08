import { describe, expect, it } from 'vitest';
import { mergeExtensions } from './extensions-merge.js';
import { parseJsonc } from './jsonc.js';

describe('mergeExtensions', () => {
  it('creates the file from scratch when it does not exist', () => {
    const result = mergeExtensions(undefined, ['dbaeumer.vscode-eslint']);

    expect(parseJsonc(result.nextText).value).toEqual({
      recommendations: ['dbaeumer.vscode-eslint'],
    });
    expect(result.added).toEqual(['dbaeumer.vscode-eslint']);
  });

  it('unions new ids with existing ones, preserving existing order and appending new ones at the end', () => {
    const existing = '{\n  "recommendations": ["foo.bar"]\n}\n';

    const result = mergeExtensions(existing, ['baz.qux']);

    expect(parseJsonc(result.nextText).value).toEqual({ recommendations: ['foo.bar', 'baz.qux'] });
    expect(result.added).toEqual(['baz.qux']);
  });

  it('treats extension ids as case-insensitive when checking for duplicates', () => {
    const existing = '{\n  "recommendations": ["Foo.Bar"]\n}\n';

    const result = mergeExtensions(existing, ['foo.bar']);

    expect(parseJsonc(result.nextText).value).toEqual({ recommendations: ['Foo.Bar'] });
    expect(result.added).toEqual([]);
    expect(result.alreadyPresent).toEqual(['foo.bar']);
  });

  it('never re-adds an id listed in unwantedRecommendations', () => {
    const existing = '{\n  "recommendations": [],\n  "unwantedRecommendations": ["foo.bar"]\n}\n';

    const result = mergeExtensions(existing, ['foo.bar']);

    expect(parseJsonc(result.nextText).value).toEqual({
      recommendations: [],
      unwantedRecommendations: ['foo.bar'],
    });
    expect(result.added).toEqual([]);
    expect(result.skippedUnwanted).toEqual(['foo.bar']);
  });

  it('adds multiple new ids in the order given', () => {
    const result = mergeExtensions(undefined, ['a.one', 'b.two', 'c.three']);

    expect(parseJsonc(result.nextText).value).toEqual({
      recommendations: ['a.one', 'b.two', 'c.three'],
    });
  });

  it('preserves existing comments in extensions.json', () => {
    const existing = '{\n  // do not remove\n  "recommendations": ["foo.bar"]\n}\n';

    const result = mergeExtensions(existing, ['baz.qux']);

    expect(result.nextText).toContain('// do not remove');
    expect(parseJsonc(result.nextText).value).toEqual({ recommendations: ['foo.bar', 'baz.qux'] });
  });
});
