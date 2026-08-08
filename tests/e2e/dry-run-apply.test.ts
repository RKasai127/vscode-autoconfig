import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../../src/cli/run.js';
import type { CliJsonOutput } from '../../src/core/types.js';

let projectDir: string;
let rulesPath: string;

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), 'vscode-autoconfig-e2e-'));
  writeFileSync(
    join(projectDir, 'package.json'),
    JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.5.0' } }),
  );

  rulesPath = join(projectDir, 'custom-rules.json');
  writeFileSync(
    rulesPath,
    JSON.stringify({
      schemaVersion: 1,
      rules: [
        {
          id: 'ts-rule',
          when: { ecosystem: 'node', kind: 'devDependency', name: 'typescript' },
          settings: { 'typescript.tsdk': 'node_modules/typescript/lib' },
          extensions: ['dbaeumer.vscode-eslint'],
        },
      ],
    }),
  );
});

afterEach(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

function runCli(overrides: Partial<Parameters<typeof run>[0]> = {}) {
  return run({
    cwd: projectDir,
    write: false,
    rulesPath,
    builtinRules: false,
    json: true,
    ...overrides,
  });
}

describe('dry-run / apply / idempotency flow', () => {
  it('dry-run reports the proposed changes but writes nothing', () => {
    const result = runCli({ write: false });

    expect(existsSync(join(projectDir, '.vscode'))).toBe(false);

    const json = JSON.parse(result.output) as CliJsonOutput;
    expect(json.mode).toBe('dry-run');
    expect(json.settings.added).toEqual({ 'typescript.tsdk': 'node_modules/typescript/lib' });
    expect(json.extensions.added).toEqual(['dbaeumer.vscode-eslint']);
    expect(result.exitCode).toBe(1);
  });

  it('--write creates .vscode/settings.json and extensions.json with the proposed changes', () => {
    const result = runCli({ write: true });

    expect(result.exitCode).toBe(1);

    const settings = JSON.parse(
      readFileSync(join(projectDir, '.vscode', 'settings.json'), 'utf-8'),
    );
    expect(settings).toEqual({ 'typescript.tsdk': 'node_modules/typescript/lib' });

    const extensions = JSON.parse(
      readFileSync(join(projectDir, '.vscode', 'extensions.json'), 'utf-8'),
    );
    expect(extensions).toEqual({ recommendations: ['dbaeumer.vscode-eslint'] });
  });

  it('re-running --write a second time is idempotent (no further additions)', () => {
    runCli({ write: true });
    const second = runCli({ write: true });

    const json = JSON.parse(second.output) as CliJsonOutput;
    expect(json.settings.added).toEqual({});
    expect(json.extensions.added).toEqual([]);
    expect(second.exitCode).toBe(0);
  });

  it('preserves user comments in an existing settings.json across --write', () => {
    mkdirSync(join(projectDir, '.vscode'));
    writeFileSync(
      join(projectDir, '.vscode', 'settings.json'),
      '{\n  // do not remove this\n  "editor.tabSize": 4\n}\n',
    );

    runCli({ write: true });

    const text = readFileSync(join(projectDir, '.vscode', 'settings.json'), 'utf-8');
    expect(text).toContain('// do not remove this');
    expect(JSON.parse(text.replace(/\/\/.*$/gm, ''))).toEqual({
      'editor.tabSize': 4,
      'typescript.tsdk': 'node_modules/typescript/lib',
    });
  });
});
