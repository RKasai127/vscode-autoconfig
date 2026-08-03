import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { nodeDetector } from './node.js';
import { DetectorError } from './types.js';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../tests/fixtures/node-projects',
);

describe('nodeDetector', () => {
  it('detects manifest, dependencies, and config files for a typescript+react project', () => {
    const findings = nodeDetector.detect({ cwd: join(fixturesDir, 'typescript-react') });

    expect(findings).toContainEqual({
      ecosystem: 'node',
      kind: 'manifestPresence',
      name: 'package.json',
    });
    expect(findings).toContainEqual({ ecosystem: 'node', kind: 'dependency', name: 'react' });
    expect(findings).toContainEqual({
      ecosystem: 'node',
      kind: 'devDependency',
      name: 'typescript',
    });
    expect(findings).toContainEqual({ ecosystem: 'node', kind: 'devDependency', name: 'eslint' });
    expect(findings).toContainEqual({
      ecosystem: 'node',
      kind: 'configFilePresence',
      name: 'tsconfig.json',
    });
    expect(findings).toContainEqual({
      ecosystem: 'node',
      kind: 'configFilePresence',
      name: '.eslintrc.json',
    });
    expect(findings).toContainEqual({ ecosystem: 'node', kind: 'scriptPresence', name: 'build' });
  });

  it('returns no findings for a directory with no manifest and no config files', () => {
    const findings = nodeDetector.detect({
      cwd: join(fixturesDir, '..', 'python-projects', 'requirements-txt'),
    });
    expect(findings).toEqual([]);
  });

  it('returns only manifestPresence for a project with no dependencies or config files', () => {
    const findings = nodeDetector.detect({ cwd: join(fixturesDir, 'minimal') });
    expect(findings).toEqual([
      { ecosystem: 'node', kind: 'manifestPresence', name: 'package.json' },
    ]);
  });

  it('throws a DetectorError when package.json is malformed', () => {
    expect(() => nodeDetector.detect({ cwd: join(fixturesDir, 'malformed') })).toThrow(
      DetectorError,
    );
  });
});
