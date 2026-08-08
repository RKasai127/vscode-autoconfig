import { join } from 'node:path';

export function vscodeDir(cwd: string): string {
  return join(cwd, '.vscode');
}

export function settingsJsonPath(cwd: string): string {
  return join(cwd, '.vscode', 'settings.json');
}

export function extensionsJsonPath(cwd: string): string {
  return join(cwd, '.vscode', 'extensions.json');
}
