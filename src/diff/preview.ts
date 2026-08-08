import type {
  AggregatedResult,
  CliJsonOutput,
  Ecosystem,
  JsonValue,
  Finding,
} from '../core/types.js';
import { mergeExtensions } from '../vscode/extensions-merge.js';
import { parseJsonc } from '../vscode/jsonc.js';
import { mergeSettings } from '../vscode/settings-merge.js';

export interface PreviewFile {
  path: string;
  label: 'settings.json' | 'extensions.json';
  existed: boolean;
  before: string;
  after: string;
}

export interface BuildPreviewParams {
  mode: 'dry-run' | 'write';
  findings: Finding[];
  ecosystems: Ecosystem[];
  aggregated: AggregatedResult;
  settingsPath: string;
  extensionsPath: string;
  settingsText: string | undefined;
  extensionsText: string | undefined;
}

export interface PreviewResult {
  json: CliJsonOutput;
  files: PreviewFile[];
}

function checkParseError(text: string | undefined): { line: number; message: string } | undefined {
  if (text === undefined) return undefined;

  const parsed = parseJsonc(text);
  if (parsed.errors.length === 0) return undefined;

  const first = parsed.errors[0]!;
  return { line: first.line, message: first.message };
}

export function buildPreview(params: BuildPreviewParams): PreviewResult {
  const {
    mode,
    findings,
    ecosystems,
    aggregated,
    settingsPath,
    extensionsPath,
    settingsText,
    extensionsText,
  } = params;
  const files: PreviewFile[] = [];
  const skippedFiles: CliJsonOutput['skippedFiles'] = [];

  let settingsAdded: Record<string, JsonValue> = {};
  let settingsSkipped: Record<string, string> = {};

  const settingsError = checkParseError(settingsText);

  if (settingsError) {
    skippedFiles.push({
      file: settingsPath,
      reason: `Syntax error near line ${settingsError.line} of settings.json (${settingsError.message}). This file was skipped.`,
      line: settingsError.line,
    });
  } else {
    const result = mergeSettings(settingsText, aggregated.settings);
    settingsAdded = result.added;
    settingsSkipped = result.skipped;
    files.push({
      path: settingsPath,
      label: 'settings.json',
      existed: settingsText !== undefined,
      before: settingsText ?? '',
      after: result.nextText,
    });
  }

  let extensionsAdded: string[] = [];
  let extensionsAlreadyPresent: string[] = [];
  let extensionsUnwanted: string[] = [];

  const extensionsError = checkParseError(extensionsText);
  
  if (extensionsError) {
    skippedFiles.push({
      file: extensionsPath,
      reason: `Syntax error near line ${extensionsError.line} of extensions.json (${extensionsError.message}). This file was skipped.`,
      line: extensionsError.line,
    });
  } else {
    const result = mergeExtensions(extensionsText, aggregated.extensions);
    extensionsAdded = result.added;
    extensionsAlreadyPresent = result.alreadyPresent;
    extensionsUnwanted = result.skippedUnwanted;
    files.push({
      path: extensionsPath,
      label: 'extensions.json',
      existed: extensionsText !== undefined,
      before: extensionsText ?? '',
      after: result.nextText,
    });
  }

  const json: CliJsonOutput = {
    mode,
    detected: { ecosystems, findings },
    matchedRules: aggregated.matchedRuleIds,
    settings: { added: settingsAdded, skipped: settingsSkipped },
    extensions: {
      added: extensionsAdded,
      alreadyPresent: extensionsAlreadyPresent,
      unwanted: extensionsUnwanted,
    },
    conflicts: aggregated.conflicts,
    skippedFiles,
  };

  return { json, files };
}
