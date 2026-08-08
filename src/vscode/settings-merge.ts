import type { JsonValue } from '../core/types.js';
import { parseJsonc, setJsoncValue } from './jsonc.js';

export interface SettingsMergeResult {
  nextText: string;
  added: Record<string, JsonValue>;
  skipped: Record<string, string>;
}

function isPlainObject(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Language-scope override keys (e.g. "[python]") are allowed one extra level
// of merging beyond ordinary object-valued keys, since rules commonly need to
// reach "[python]" -> "editor.codeActionsOnSave" -> "source.fixAll.ruff".
function isLanguageOverrideKey(key: string): boolean {
  return /^\[.+]$/.test(key);
}

interface PlannedAddition {
  path: string[];
  value: JsonValue;
}

function planNested(
  path: string[],
  currentValue: JsonValue | undefined,
  patchValue: JsonValue,
  depthRemaining: number,
  additions: PlannedAddition[],
  skipped: Record<string, string>,
): void {
  if (depthRemaining <= 0 || !isPlainObject(currentValue) || !isPlainObject(patchValue)) {
    skipped[path.join('.')] = 'existing';
    return;
  }

  for (const [subKey, subValue] of Object.entries(patchValue)) {
    const subPath = [...path, subKey];

    if (!(subKey in currentValue)) {
      additions.push({ path: subPath, value: subValue });
      continue;
    }

    planNested(subPath, currentValue[subKey], subValue, depthRemaining - 1, additions, skipped);
  }
}

function planSettingsPatch(
  current: Record<string, JsonValue>,
  patch: Record<string, JsonValue>,
): { additions: PlannedAddition[]; skipped: Record<string, string> } {
  const additions: PlannedAddition[] = [];
  const skipped: Record<string, string> = {};

  for (const [key, value] of Object.entries(patch)) {
    if (!(key in current)) {
      additions.push({ path: [key], value });
      continue;
    }

    const maxDepth = isLanguageOverrideKey(key) ? 2 : 1;

    planNested([key], current[key], value, maxDepth, additions, skipped);
  }

  return { additions, skipped };
}

export function mergeSettings(
  existingText: string | undefined,
  patch: Record<string, JsonValue>,
): SettingsMergeResult {
  const baseText = existingText && existingText.trim().length > 0 ? existingText : '{}';
  const parsed = parseJsonc<Record<string, JsonValue>>(baseText);
  const current = parsed.value ?? {};

  const { additions, skipped } = planSettingsPatch(current, patch);

  let text = baseText;
  const added: Record<string, JsonValue> = {};
  
  for (const addition of additions) {
    text = setJsoncValue(text, addition.path, addition.value);
    added[addition.path.join('.')] = addition.value;
  }

  return { nextText: text, added, skipped };
}
