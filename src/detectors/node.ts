import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Finding } from '../core/types.js';
import { DetectorError, type Detector } from './types.js';

// Checked directly under the project root only — never traversed recursively,
// so files inside node_modules/** cannot be mistaken for the project's own config.
const NODE_CONFIG_FILENAMES = [
  'tsconfig.json',
  '.eslintrc',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.yml',
  '.eslintrc.yaml',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  'prettier.config.js',
  'prettier.config.cjs',
];

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export const nodeDetector: Detector = {
  ecosystem: 'node',

  detect(ctx) {
    const findings: Finding[] = [];
    const pkgPath = join(ctx.cwd, 'package.json');

    if (existsSync(pkgPath)) {
      findings.push({ ecosystem: 'node', kind: 'manifestPresence', name: 'package.json' });

      let pkg: PackageJsonShape;

      try {
        pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJsonShape;
      } catch (error) {
        throw new DetectorError(`Failed to parse package.json: ${(error as Error).message}`);
      }

      for (const name of Object.keys(pkg.dependencies ?? {})) {
        findings.push({ ecosystem: 'node', kind: 'dependency', name });
      }

      for (const name of Object.keys(pkg.devDependencies ?? {})) {
        findings.push({ ecosystem: 'node', kind: 'devDependency', name });
      }

      for (const name of Object.keys(pkg.scripts ?? {})) {
        findings.push({ ecosystem: 'node', kind: 'scriptPresence', name });
      }
    }

    for (const filename of NODE_CONFIG_FILENAMES) {
      if (existsSync(join(ctx.cwd, filename))) {
        findings.push({ ecosystem: 'node', kind: 'configFilePresence', name: filename });
      }
    }

    return findings;
  },
};
