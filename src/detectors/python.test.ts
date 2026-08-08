import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pythonDetector } from './python.js';
import { DetectorError } from './types.js';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../tests/fixtures/python-projects',
);

describe('pythonDetector', () => {
  it('parses dependency names out of requirements.txt, ignoring comments and options', () => {
    const findings = pythonDetector.detect({ cwd: join(fixturesDir, 'requirements-txt') });

    expect(findings).toContainEqual({
      ecosystem: 'python',
      kind: 'manifestPresence',
      name: 'requirements.txt',
    });
    expect(findings).toContainEqual({ ecosystem: 'python', kind: 'dependency', name: 'requests' });
    expect(findings).toContainEqual({ ecosystem: 'python', kind: 'dependency', name: 'black' });
    expect(findings).toContainEqual({ ecosystem: 'python', kind: 'dependency', name: 'ruff' });
    expect(findings).toContainEqual({ ecosystem: 'python', kind: 'dependency', name: 'mypy' });
    // "-r other-requirements.txt" is an option line, not a package
    expect(findings.filter((s) => s.name === 'other-requirements.txt')).toEqual([]);
  });

  it('parses poetry dependencies and dev-group dependencies from pyproject.toml', () => {
    const findings = pythonDetector.detect({ cwd: join(fixturesDir, 'pyproject-poetry') });

    expect(findings).toContainEqual({
      ecosystem: 'python',
      kind: 'manifestPresence',
      name: 'pyproject.toml',
    });
    expect(findings).toContainEqual({ ecosystem: 'python', kind: 'dependency', name: 'requests' });
    expect(findings).toContainEqual({ ecosystem: 'python', kind: 'devDependency', name: 'black' });
    expect(findings).toContainEqual({ ecosystem: 'python', kind: 'devDependency', name: 'ruff' });
    // the "python" version constraint itself must never be treated as a dependency
    expect(findings.filter((s) => s.name === 'python')).toEqual([]);
  });

  it('parses PEP 621 project.dependencies from pyproject.toml', () => {
    const findings = pythonDetector.detect({ cwd: join(fixturesDir, 'pyproject-pep621') });

    expect(findings).toContainEqual({ ecosystem: 'python', kind: 'dependency', name: 'requests' });
    expect(findings).toContainEqual({ ecosystem: 'python', kind: 'dependency', name: 'black' });
  });

  it('returns no findings for a directory with neither requirements.txt nor pyproject.toml', () => {
    const fixturesNodeDir = join(fixturesDir, '..', 'node-projects', 'minimal');

    expect(pythonDetector.detect({ cwd: fixturesNodeDir })).toEqual([]);
  });

  it('throws a DetectorError when pyproject.toml is malformed', () => {
    expect(() => pythonDetector.detect({ cwd: join(fixturesDir, 'malformed-pyproject') })).toThrow(
      DetectorError,
    );
  });
});
