import { describe, expect, it } from 'vitest';
import { mergeSettings } from './settings-merge.js';
import { parseJsonc } from './jsonc.js';

function parsedResult(text: string) {
  return parseJsonc(text).value;
}

describe('mergeSettings', () => {
  it('creates the file from scratch when it does not exist', () => {
    const result = mergeSettings(undefined, { 'typescript.tsdk': 'node_modules/typescript/lib' });

    expect(parsedResult(result.nextText)).toEqual({
      'typescript.tsdk': 'node_modules/typescript/lib',
    });
    expect(result.added).toEqual({ 'typescript.tsdk': 'node_modules/typescript/lib' });
    expect(result.skipped).toEqual({});
  });

  it('adds a missing top-level key alongside unrelated existing keys', () => {
    const existing = '{\n  "editor.tabSize": 4\n}\n';

    const result = mergeSettings(existing, { 'files.autoSave': 'onFocusChange' });

    expect(parsedResult(result.nextText)).toEqual({
      'editor.tabSize': 4,
      'files.autoSave': 'onFocusChange',
    });
  });

  it('skips a key the user already set, never overwriting it', () => {
    const existing = '{\n  "editor.tabSize": 4\n}\n';

    const result = mergeSettings(existing, { 'editor.tabSize': 2 });

    expect(parsedResult(result.nextText)).toEqual({ 'editor.tabSize': 4 });
    expect(result.added).toEqual({});
    expect(result.skipped).toEqual({ 'editor.tabSize': 'existing' });
  });

  it('merges one level into an existing ordinary object-valued key', () => {
    const existing = '{\n  "files.exclude": { "**/.git": true }\n}\n';

    const result = mergeSettings(existing, { 'files.exclude': { '**/node_modules': true } });

    expect(parsedResult(result.nextText)).toEqual({
      'files.exclude': { '**/.git': true, '**/node_modules': true },
    });
    expect(result.added).toEqual({ 'files.exclude.**/node_modules': true });
  });

  it('does not recurse a second level into an ordinary object-valued key', () => {
    const existing = '{\n  "editor.codeActionsOnSave": { "source.fixAll": true }\n}\n';

    const result = mergeSettings(existing, {
      'editor.codeActionsOnSave': { 'source.fixAll': { nested: true } },
    });

    // "source.fixAll" already exists at depth 1 -> first-wins skip, no overwrite with the nested object
    expect(parsedResult(result.nextText)).toEqual({
      'editor.codeActionsOnSave': { 'source.fixAll': true },
    });
    expect(result.skipped).toEqual({ 'editor.codeActionsOnSave.source.fixAll': 'existing' });
  });

  it('merges two levels deep for a language-scope override key', () => {
    const existing = '{\n  "[python]": { "editor.formatOnSave": true }\n}\n';

    const result = mergeSettings(existing, {
      '[python]': { 'editor.codeActionsOnSave': { 'source.fixAll.ruff': true } },
    });

    expect(parsedResult(result.nextText)).toEqual({
      '[python]': {
        'editor.formatOnSave': true,
        'editor.codeActionsOnSave': { 'source.fixAll.ruff': true },
      },
    });
    expect(result.added).toEqual({
      '[python].editor.codeActionsOnSave': { 'source.fixAll.ruff': true },
    });
  });

  it('merges into an existing nested object under a language-scope key without overwriting', () => {
    const existing =
      '{\n  "[python]": { "editor.codeActionsOnSave": { "source.fixAll.ruff": true } }\n}\n';

    const result = mergeSettings(existing, {
      '[python]': { 'editor.codeActionsOnSave': { 'source.organizeImports.ruff': true } },
    });

    expect(parsedResult(result.nextText)).toEqual({
      '[python]': {
        'editor.codeActionsOnSave': {
          'source.fixAll.ruff': true,
          'source.organizeImports.ruff': true,
        },
      },
    });
  });

  it('skips beyond the second level even for a language-scope override key', () => {
    const existing =
      '{\n  "[python]": { "editor.codeActionsOnSave": { "source.fixAll.ruff": true } }\n}\n';

    const result = mergeSettings(existing, {
      '[python]': {
        'editor.codeActionsOnSave': { 'source.fixAll.ruff': { evenDeeper: true } },
      },
    });

    expect(result.skipped).toEqual({
      '[python].editor.codeActionsOnSave.source.fixAll.ruff': 'existing',
    });
  });

  it('preserves existing comments in settings.json', () => {
    const existing = '{\n  // keep this comment\n  "editor.tabSize": 4\n}\n';

    const result = mergeSettings(existing, { 'files.autoSave': 'onFocusChange' });
    
    expect(result.nextText).toContain('// keep this comment');
    expect(parsedResult(result.nextText)).toEqual({
      'editor.tabSize': 4,
      'files.autoSave': 'onFocusChange',
    });
  });
});
