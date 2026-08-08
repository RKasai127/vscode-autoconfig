import type { Rule, RuleCondition, Finding, FindingMatcher } from './types.js';

function isFindingMatcher(condition: RuleCondition): condition is FindingMatcher {
  return !('all' in condition) && !('any' in condition) && !('not' in condition);
}

function matchesFinding(matcher: FindingMatcher, finding: Finding): boolean {
  if (matcher.ecosystem !== undefined && matcher.ecosystem !== finding.ecosystem) return false;
  if (matcher.kind !== undefined && matcher.kind !== finding.kind) return false;
  if (matcher.name !== undefined && matcher.name !== finding.name) return false;
  return true;
}

export function matchesCondition(condition: RuleCondition, findings: Finding[]): boolean {
  if ('all' in condition) {
    return condition.all.every((sub) => matchesCondition(sub, findings));
  }
  if ('any' in condition) {
    return condition.any.some((sub) => matchesCondition(sub, findings));
  }
  if ('not' in condition) {
    return !matchesCondition(condition.not, findings);
  }
  if (isFindingMatcher(condition)) {
    return findings.some((finding) => matchesFinding(condition, finding));
  }
  return false;
}

export function evaluateRules(findings: Finding[], rules: Rule[]): Rule[] {
  return rules.filter((rule) => matchesCondition(rule.when, findings));
}
