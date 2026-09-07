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
    const existing = '{\n  "recommendations": ["esbenp.prettier-vscode"]\n}\n';

    const result = mergeExtensions(existing, ['ms-python.python']);

    expect(parseJsonc(result.nextText).value).toEqual({
      recommendations: ['esbenp.prettier-vscode', 'ms-python.python'],
    });
    expect(result.added).toEqual(['ms-python.python']);
  });

  it('treats extension ids as case-insensitive when checking for duplicates', () => {
    const existing = '{\n  "recommendations": ["Ms-Python.Python"]\n}\n';

    const result = mergeExtensions(existing, ['ms-python.python']);

    expect(parseJsonc(result.nextText).value).toEqual({ recommendations: ['Ms-Python.Python'] });
    expect(result.added).toEqual([]);
    expect(result.alreadyPresent).toEqual(['ms-python.python']);
  });

  it('never re-adds an id listed in unwantedRecommendations', () => {
    const existing =
      '{\n  "recommendations": [],\n  "unwantedRecommendations": ["ms-python.autopep8"]\n}\n';

    const result = mergeExtensions(existing, ['ms-python.autopep8']);

    expect(parseJsonc(result.nextText).value).toEqual({
      recommendations: [],
      unwantedRecommendations: ['ms-python.autopep8'],
    });
    expect(result.added).toEqual([]);
    expect(result.skippedUnwanted).toEqual(['ms-python.autopep8']);
  });

  it('adds multiple new ids in the order given', () => {
    const result = mergeExtensions(undefined, [
      'ms-python.python',
      'ms-python.vscode-pylance',
      'ms-python.black-formatter',
    ]);

    expect(parseJsonc(result.nextText).value).toEqual({
      recommendations: ['ms-python.python', 'ms-python.vscode-pylance', 'ms-python.black-formatter'],
    });
  });

  it('preserves existing comments in extensions.json', () => {
    const existing = '{\n  // do not remove\n  "recommendations": ["esbenp.prettier-vscode"]\n}\n';

    const result = mergeExtensions(existing, ['dbaeumer.vscode-eslint']);

    expect(result.nextText).toContain('// do not remove');
    expect(parseJsonc(result.nextText).value).toEqual({
      recommendations: ['esbenp.prettier-vscode', 'dbaeumer.vscode-eslint'],
    });
  });
});
