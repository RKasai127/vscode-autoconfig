import { diffLines } from 'diff';
import pc from 'picocolors';
import type { CliJsonOutput } from '../core/types.js';
import type { PreviewFile } from './preview.js';

export function renderJson(json: CliJsonOutput): string {
  return JSON.stringify(json, null, 2);
}

export function renderTerminal(json: CliJsonOutput, files: PreviewFile[]): string {
  const lines: string[] = [];
  const title =
    json.mode === 'dry-run'
      ? 'vscode-autoconfig — dry run (no files written)'
      : 'vscode-autoconfig — applying changes';
  lines.push(pc.bold(title));
  lines.push('');

  if (json.detected.findings.length > 0) {
    lines.push(pc.bold('Detected'));
    for (const finding of json.detected.findings) {
      lines.push(`  ${finding.ecosystem.padEnd(7)} ${finding.name} (${finding.kind})`);
    }
    lines.push('');
  }

  for (const file of files) {
    if (file.before === file.after) continue;

    lines.push(pc.bold(`${file.path}${file.existed ? '' : ' (will be created)'}`));
    
    for (const part of diffLines(file.before, file.after)) {
      if (part.removed) continue;
      const prefix = part.added ? '+' : ' ';
      const colorize = part.added ? pc.green : (s: string) => s;
      for (const line of part.value.split('\n')) {
        if (line.length === 0) continue;
        lines.push(colorize(`  ${prefix} ${line}`));
      }
    }
    lines.push('');
  }

  if (json.conflicts.length > 0) {
    lines.push(pc.yellow('Conflicts (first matching rule wins, no overwrite):'));
    for (const conflict of json.conflicts) {
      lines.push(
        `  ${conflict.key}: "${conflict.winningRuleId}" wins over ${conflict.ignoredRuleIds.join(', ')}`,
      );
    }
    lines.push('');
  }

  if (json.skippedFiles.length > 0) {
    lines.push(pc.red('Skipped files:'));
    for (const skipped of json.skippedFiles) {
      lines.push(`  ${skipped.file}: ${skipped.reason}`);
    }
    lines.push('');
  }

  const settingsAddedCount = Object.keys(json.settings.added).length;
  const extensionsAddedCount = json.extensions.added.length;
  lines.push(`${settingsAddedCount} settings, ${extensionsAddedCount} extensions would be added.`);
  if (json.mode === 'dry-run') {
    lines.push('Run again with --write to apply.');
  }

  return lines.join('\n');
}
