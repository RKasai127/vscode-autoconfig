import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Rule } from '../core/types.js';
import { ruleFileSchema } from './schema.js';
import nodeRulesJson from './node.json' with { type: 'json' };
import pythonRulesJson from './python.json' with { type: 'json' };

export class RuleFileValidationError extends Error {}

function validate(source: string, raw: unknown): Rule[] {
  const result = ruleFileSchema.safeParse(raw);

  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new RuleFileValidationError(`Rule file "${source}" failed validation:\n${messages}`);
  }

  return result.data.rules;
}

export function loadBuiltinRules(): Rule[] {
  return [...validate('node.json', nodeRulesJson), ...validate('python.json', pythonRulesJson)];
}

export function loadExternalRules(path: string): Rule[] {
  const raw = readFileSync(path, 'utf-8');
  const ext = extname(path).toLowerCase();
  const parsed = ext === '.yaml' || ext === '.yml' ? parseYaml(raw) : JSON.parse(raw);
  return validate(path, parsed);
}

export interface LoadRulesOptions {
  externalPath?: string;
  useBuiltinRules?: boolean;
}

function checkForDuplicateIds(rules: Rule[]): void {
  const ruleIds = new Set<string>();
  for (const rule of rules) {
    if (ruleIds.has(rule.id)) {
      throw new RuleFileValidationError(
        `Rule id "${rule.id}" is duplicated across the built-in and external rule sets. Rule ids must be unique.`,
      );
    }
    ruleIds.add(rule.id);
  }
}

export function loadRules({ externalPath, useBuiltinRules = true }: LoadRulesOptions = {}): Rule[] {
  const externalRules = externalPath ? loadExternalRules(externalPath) : [];
  const rules = useBuiltinRules ? [...loadBuiltinRules(), ...externalRules] : externalRules;

  checkForDuplicateIds(rules);

  return rules;
}
