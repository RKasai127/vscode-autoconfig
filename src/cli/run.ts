import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { aggregate } from '../core/aggregate.js';
import { evaluateRules } from '../core/engine.js';
import type { Ecosystem } from '../core/types.js';
import { collectFindings } from '../detectors/collect.js';
import { buildPreview } from '../diff/preview.js';
import { renderJson, renderTerminal } from '../diff/render.js';
import { loadRules, RuleFileValidationError } from '../rules/loader.js';
import { extensionsJsonPath, settingsJsonPath, vscodeDir } from '../vscode/paths.js';

export interface RunOptions {
  cwd: string;
  write: boolean;
  ecosystems?: string[];
  rulesPath?: string;
  builtinRules?: boolean;
  json: boolean;
}

export interface RunResult {
  exitCode: number;
  output: string;
}

export function run(options: RunOptions): RunResult {
  try {
    const rules = loadRules({
      externalPath: options.rulesPath,
      useBuiltinRules: options.builtinRules,
    });

    const { findings, errors } = collectFindings(
      { cwd: options.cwd },
      { ecosystems: options.ecosystems as Ecosystem[] | undefined },
    );

    const matchedRules = evaluateRules(findings, rules);
    const aggregated = aggregate(matchedRules);

    const settingsPath = settingsJsonPath(options.cwd);
    const extensionsPath = extensionsJsonPath(options.cwd);
    const settingsText = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf-8') : undefined;
    const extensionsText = existsSync(extensionsPath)
      ? readFileSync(extensionsPath, 'utf-8')
      : undefined;

    const ecosystemsDetected = [...new Set(findings.map((s) => s.ecosystem))];

    const preview = buildPreview({
      mode: options.write ? 'write' : 'dry-run',
      findings,
      ecosystems: ecosystemsDetected,
      aggregated,
      settingsPath,
      extensionsPath,
      settingsText,
      extensionsText,
    });

    const hasDiff =
      Object.keys(preview.json.settings.added).length > 0 ||
      preview.json.extensions.added.length > 0;
    const hasErrors = errors.length > 0 || preview.json.skippedFiles.length > 0;

    const reportLines = errors.map((error) => `Error: ${error}`);
    const report = options.json
      ? renderJson(preview.json)
      : renderTerminal(preview.json, preview.files);
    const outputLines = [...reportLines, report];

    if (options.write && hasDiff) {
      mkdirSync(vscodeDir(options.cwd), { recursive: true });
      for (const file of preview.files) {
        if (file.before !== file.after) {
          writeFileSync(file.path, file.after, 'utf-8');
        }
      }
    }

    return { exitCode: hasErrors ? 2 : hasDiff ? 1 : 0, output: outputLines.join('\n') };
  } catch (error) {
    if (error instanceof RuleFileValidationError) {
      return { exitCode: 2, output: `Error: ${error.message}` };
    }
    throw error;
  }
}
