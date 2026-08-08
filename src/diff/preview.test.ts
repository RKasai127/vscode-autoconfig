import { describe, expect, it } from 'vitest';
import type { AggregatedResult } from '../core/types.js';
import { buildPreview } from './preview.js';

const emptyAggregated: AggregatedResult = {
  matchedRuleIds: [],
  settings: {},
  extensions: [],
  conflicts: [],
};

describe('buildPreview', () => {
  it('produces additions for both files when neither exists yet', () => {
    const aggregated: AggregatedResult = {
      matchedRuleIds: ['r1'],
      settings: { 'a.b': 1 },
      extensions: ['foo.bar'],
      conflicts: [],
    };

    const result = buildPreview({
      mode: 'dry-run',
      findings: [],
      ecosystems: ['node'],
      aggregated,
      settingsPath: '/proj/.vscode/settings.json',
      extensionsPath: '/proj/.vscode/extensions.json',
      settingsText: undefined,
      extensionsText: undefined,
    });

    expect(result.json.settings.added).toEqual({ 'a.b': 1 });
    expect(result.json.extensions.added).toEqual(['foo.bar']);
    expect(result.json.skippedFiles).toEqual([]);
    expect(result.files).toHaveLength(2);
    expect(result.files.every((f) => !f.existed)).toBe(true);
  });

  it('records a skippedFile and skips merging when settings.json is malformed', () => {
    const result = buildPreview({
      mode: 'dry-run',
      findings: [],
      ecosystems: [],
      aggregated: emptyAggregated,
      settingsPath: '/proj/.vscode/settings.json',
      extensionsPath: '/proj/.vscode/extensions.json',
      settingsText: '{ "a": 1 "b": 2 }',
      extensionsText: undefined,
    });

    expect(result.json.skippedFiles).toHaveLength(1);
    expect(result.json.skippedFiles[0]?.file).toBe('/proj/.vscode/settings.json');
    expect(result.files.some((f) => f.label === 'settings.json')).toBe(false);
    expect(result.files.some((f) => f.label === 'extensions.json')).toBe(true);
  });

  it('produces no additions and an empty diff on a second identical run (idempotency source)', () => {
    const aggregated: AggregatedResult = {
      matchedRuleIds: ['r1'],
      settings: { 'a.b': 1 },
      extensions: ['foo.bar'],
      conflicts: [],
    };

    const first = buildPreview({
      mode: 'write',
      findings: [],
      ecosystems: [],
      aggregated,
      settingsPath: '/proj/.vscode/settings.json',
      extensionsPath: '/proj/.vscode/extensions.json',
      settingsText: undefined,
      extensionsText: undefined,
    });
    
    const settingsAfter = first.files.find((f) => f.label === 'settings.json')!.after;
    const extensionsAfter = first.files.find((f) => f.label === 'extensions.json')!.after;

    const second = buildPreview({
      mode: 'write',
      findings: [],
      ecosystems: [],
      aggregated,
      settingsPath: '/proj/.vscode/settings.json',
      extensionsPath: '/proj/.vscode/extensions.json',
      settingsText: settingsAfter,
      extensionsText: extensionsAfter,
    });

    expect(second.json.settings.added).toEqual({});
    expect(second.json.extensions.added).toEqual([]);
  });
});
