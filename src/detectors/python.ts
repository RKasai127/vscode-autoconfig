import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import type { Finding } from '../core/types.js';
import { DetectorError, type Detector } from './types.js';

interface PyprojectShape {
  project?: { dependencies?: unknown };
  tool?: {
    poetry?: {
      dependencies?: Record<string, unknown>;
      group?: { dev?: { dependencies?: Record<string, unknown> } };
      'dev-dependencies'?: Record<string, unknown>;
    };
  };
}

function parsePackageName(spec: string): string | null {
  const match = spec.trim().match(/^([A-Za-z0-9_.-]+)/);
  return match?.[1] ?? null;
}

function parseRequirementsTxt(content: string): string[] {
  const names: string[] = [];
  for (const rawLine of content.split('\n')) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (!line || line.startsWith('-')) continue;
    const name = parsePackageName(line);
    if (name) names.push(name);
  }
  return names;
}

function parsePyprojectToml(content: string): {
  dependencies: string[];
  devDependencies: string[];
} {
  const doc = parseToml(content) as PyprojectShape;
  const dependencies: string[] = [];
  const devDependencies: string[] = [];

  const pep621Deps = doc.project?.dependencies;
  if (Array.isArray(pep621Deps)) {
    for (const spec of pep621Deps) {
      if (typeof spec !== 'string') continue;
      const name = parsePackageName(spec);
      if (name) dependencies.push(name);
    }
  }

  const poetryDeps = doc.tool?.poetry?.dependencies ?? {};
  for (const name of Object.keys(poetryDeps)) {
    if (name === 'python') continue;
    dependencies.push(name);
  }

  const poetryDevDeps =
    doc.tool?.poetry?.group?.dev?.dependencies ?? doc.tool?.poetry?.['dev-dependencies'] ?? {};
  for (const name of Object.keys(poetryDevDeps)) {
    devDependencies.push(name);
  }

  return { dependencies, devDependencies };
}

export const pythonDetector: Detector = {
  ecosystem: 'python',

  detect(ctx) {
    const findings: Finding[] = [];

    const requirementsPath = join(ctx.cwd, 'requirements.txt');

    if (existsSync(requirementsPath)) {
      findings.push({ ecosystem: 'python', kind: 'manifestPresence', name: 'requirements.txt' });

      const names = parseRequirementsTxt(readFileSync(requirementsPath, 'utf-8'));

      for (const name of names) {
        findings.push({ ecosystem: 'python', kind: 'dependency', name });
      }
    }

    const pyprojectPath = join(ctx.cwd, 'pyproject.toml');

    if (existsSync(pyprojectPath)) {
      findings.push({ ecosystem: 'python', kind: 'manifestPresence', name: 'pyproject.toml' });

      let parsed: { dependencies: string[]; devDependencies: string[] };

      try {
        parsed = parsePyprojectToml(readFileSync(pyprojectPath, 'utf-8'));
      } catch (error) {
        throw new DetectorError(`Failed to parse pyproject.toml: ${(error as Error).message}`);
      }

      for (const name of parsed.dependencies) {
        findings.push({ ecosystem: 'python', kind: 'dependency', name });
      }

      for (const name of parsed.devDependencies) {
        findings.push({ ecosystem: 'python', kind: 'devDependency', name });
      }
    }

    return findings;
  },
};
