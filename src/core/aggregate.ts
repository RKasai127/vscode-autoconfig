import type { AggregatedResult, JsonValue, Rule, SettingConflict } from './types.js';

function deepEqual(a: JsonValue, b: JsonValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isPlainObject(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Language-scope override keys (e.g. "[python]") get one extra level of
// merging across rules, mirroring vscode/settings-merge.ts, so that e.g. a
// black rule and a ruff rule can both contribute under "[python]" without
// clobbering each other.
function isLanguageOverrideKey(key: string): boolean {
  return /^\[.+]$/.test(key);
}

function mergeKey(
  target: Record<string, JsonValue>,
  key: string,
  patchValue: JsonValue,
  depthRemaining: number,
  pathLabel: string,
  ruleId: string,
  owners: Map<string, string>,
  conflicts: Map<string, SettingConflict>,
): void {
  if (!(key in target)) {
    target[key] = structuredClone(patchValue);
    owners.set(pathLabel, ruleId);
    return;
  }

  const currentValue = target[key]!;

  if (deepEqual(currentValue, patchValue)) return;

  if (depthRemaining > 0 && isPlainObject(currentValue) && isPlainObject(patchValue)) {
    for (const [subKey, subValue] of Object.entries(patchValue)) {
      mergeKey(
        currentValue,
        subKey,
        subValue,
        depthRemaining - 1,
        `${pathLabel}.${subKey}`,
        ruleId,
        owners,
        conflicts,
      );
    }
    return;
  }

  const existingConflict = conflicts.get(pathLabel);
  
  if (existingConflict) {
    existingConflict.ignoredRuleIds.push(ruleId);
  } else {
    conflicts.set(pathLabel, {
      key: pathLabel,
      winningRuleId: owners.get(pathLabel) ?? ruleId,
      ignoredRuleIds: [ruleId],
    });
  }
}

export function aggregate(matchedRules: Rule[]): AggregatedResult {
  const settings: Record<string, JsonValue> = {};
  const owners = new Map<string, string>();
  const conflictsByKey = new Map<string, SettingConflict>();
  const extensionIds = new Map<string, string>();

  for (const rule of matchedRules) {
    for (const [key, value] of Object.entries(rule.settings ?? {})) {
      const maxDepth = isLanguageOverrideKey(key) ? 2 : 1;
      mergeKey(settings, key, value, maxDepth, key, rule.id, owners, conflictsByKey);
    }

    for (const extensionId of rule.extensions ?? []) {
      const lower = extensionId.toLowerCase();
      if (!extensionIds.has(lower)) {
        extensionIds.set(lower, extensionId);
      }
    }
  }

  return {
    matchedRuleIds: matchedRules.map((rule) => rule.id),
    settings,
    extensions: [...extensionIds.values()].sort((a, b) => a.localeCompare(b)),
    conflicts: [...conflictsByKey.values()],
  };
}
