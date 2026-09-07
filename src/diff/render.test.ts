import { describe, expect, it } from 'vitest';
import type { CliJsonOutput } from '../core/types.js';
import { renderJson, renderTerminal } from './render.js';
import type { PreviewFile } from './preview.js';

const baseJson: CliJsonOutput = {
  mode: 'dry-run',
  detected: {
    ecosystems: ['node'],
    findings: [{ ecosystem: 'node', kind: 'dependency', name: 'react' }],
  },
  matchedRules: ['node-react-dependency'],
  settings: { added: { 'editor.defaultFormatter': 'esbenp.prettier-vscode' }, skipped: {} },
  extensions: { added: ['dsznajder.es7-react-js-snippets'], alreadyPresent: [], unwanted: [] },
  conflicts: [],
  skippedFiles: [],
};

const files: PreviewFile[] = [
  {
    path: '/proj/.vscode/settings.json',
    label: 'settings.json',
    existed: false,
    before: '',
    after: '{\n  "editor.defaultFormatter": "esbenp.prettier-vscode"\n}',
  },
];

describe('renderJson', () => {
  it('round-trips the CliJsonOutput as JSON', () => {
    expect(JSON.parse(renderJson(baseJson))).toEqual(baseJson);
  });
});

describe('renderTerminal', () => {
  it('includes detected findings, added counts, and the re-run hint in dry-run mode', () => {
    const output = renderTerminal(baseJson, files);
    expect(output).toContain('dry run');
    expect(output).toContain('react');
    expect(output).toContain('1 settings, 1 extensions would be added.');
    expect(output).toContain('Run again with --write to apply.');
  });

  it('omits the re-run hint in write mode', () => {
    const output = renderTerminal({ ...baseJson, mode: 'write' }, files);
    expect(output).not.toContain('Run again with --write to apply.');
  });

  it('surfaces skipped files and conflicts', () => {
    const json: CliJsonOutput = {
      ...baseJson,
      conflicts: [
        {
          key: 'editor.defaultFormatter',
          winningRuleId: 'python-black-dependency',
          ignoredRuleIds: ['python-autopep8-dependency'],
        },
      ],
      skippedFiles: [{ file: '/proj/.vscode/settings.json', reason: 'syntax error', line: 3 }],
    };
    const output = renderTerminal(json, files);
    expect(output).toContain('editor.defaultFormatter');
    expect(output).toContain('syntax error');
  });
});
