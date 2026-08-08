export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type Ecosystem = 'node' | 'python';

export type FindingKind =
  'dependency' | 'devDependency' | 'manifestPresence' | 'configFilePresence' | 'scriptPresence';

export interface Finding {
  ecosystem: Ecosystem;
  kind: FindingKind;
  name: string;
  version?: string;
  meta?: Record<string, unknown>;
}

export interface FindingMatcher {
  ecosystem?: Ecosystem;
  kind?: FindingKind;
  name?: string;
}

// `not` has no users in the built-in rule tables yet, but it's kept because it's the
// only way to express a negative condition (e.g. "X is present but Y is not") —
// `all`/`any` can only combine positive matches, never express absence.
export type RuleCondition =
  { all: RuleCondition[] } | { any: RuleCondition[] } | { not: RuleCondition } | FindingMatcher;

export interface Rule {
  id: string;
  description?: string;
  when: RuleCondition;
  settings?: Record<string, JsonValue>;
  extensions?: string[];
}

export const RULE_SCHEMA_VERSION = 1;

export interface RuleFile {
  schemaVersion: number;
  rules: Rule[];
}

export interface SettingConflict {
  key: string;
  winningRuleId: string;
  ignoredRuleIds: string[];
}

export interface AggregatedResult {
  matchedRuleIds: string[];
  settings: Record<string, JsonValue>;
  extensions: string[];
  conflicts: SettingConflict[];
}

export interface SkippedFile {
  file: string;
  reason: string;
  line?: number;
}

export interface CliJsonOutput {
  mode: 'dry-run' | 'write';
  detected: {
    ecosystems: Ecosystem[];
    findings: Finding[];
  };
  matchedRules: string[];
  settings: {
    added: Record<string, JsonValue>;
    skipped: Record<string, string>;
  };
  extensions: {
    added: string[];
    alreadyPresent: string[];
    unwanted: string[];
  };
  conflicts: SettingConflict[];
  skippedFiles: SkippedFile[];
}
