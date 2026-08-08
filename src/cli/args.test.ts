import { describe, expect, it } from 'vitest';
import { parseArgs } from './args.js';

const BASE = ['node', 'vscode-autoconfig'];

describe('parseArgs', () => {
  it('defaults to dry-run (write=false) with no flags', () => {
    const args = parseArgs(BASE);

    expect(args.write).toBe(false);
    expect(args.json).toBe(false);
    expect(args.builtinRules).toBe(true);
    expect(args.ecosystems).toBeUndefined();
  });

  it('parses --write, --json, --rules, --no-builtin-rules', () => {
    const args = parseArgs([
      ...BASE,
      '--write',
      '--json',
      '--rules',
      './custom.yaml',
      '--no-builtin-rules',
    ]);

    expect(args.write).toBe(true);
    expect(args.json).toBe(true);
    expect(args.rules).toBe('./custom.yaml');
    expect(args.builtinRules).toBe(false);
  });

  it('splits --ecosystems into a trimmed array', () => {
    const args = parseArgs([...BASE, '--ecosystems', 'node, python']);

    expect(args.ecosystems).toEqual(['node', 'python']);
  });
});
