import { insertJsoncArrayItem, parseJsonc } from './jsonc.js';

export interface ExtensionsMergeResult {
  nextText: string;
  added: string[];
  alreadyPresent: string[];
  skippedUnwanted: string[];
}

interface ExtensionsJsonShape {
  recommendations?: string[];
  unwantedRecommendations?: string[];
}

function readRecommendations(text: string): string[] {
  const parsed = parseJsonc<ExtensionsJsonShape>(text);
  return parsed.value?.recommendations ?? [];
}

export function mergeExtensions(
  existingText: string | undefined,
  ids: string[],
): ExtensionsMergeResult {
  const baseText = existingText && existingText.trim().length > 0 ? existingText : '{}';
  const parsed = parseJsonc<ExtensionsJsonShape>(baseText);
  const unwanted = new Set(
    (parsed.value?.unwantedRecommendations ?? []).map((id) => id.toLowerCase()),
  );
  const seen = new Set((parsed.value?.recommendations ?? []).map((id) => id.toLowerCase()));

  let text = baseText;
  const added: string[] = [];
  const alreadyPresent: string[] = [];
  const skippedUnwanted: string[] = [];

  for (const id of ids) {
    const lower = id.toLowerCase();

    if (seen.has(lower)) {
      alreadyPresent.push(id);
      continue;
    }

    if (unwanted.has(lower)) {
      skippedUnwanted.push(id);
      continue;
    }

    const currentLength = readRecommendations(text).length;
    text = insertJsoncArrayItem(text, ['recommendations'], currentLength, id);
    seen.add(lower);
    added.push(id);
  }

  return { nextText: text, added, alreadyPresent, skippedUnwanted };
}
