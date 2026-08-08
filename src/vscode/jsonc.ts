import { applyEdits, modify, parse, printParseErrorCode, type ParseError } from 'jsonc-parser';

export interface JsoncParseError {
  message: string;
  line: number;
}

export interface JsoncParseResult<T> {
  value: T | undefined;
  errors: JsoncParseError[];
}

function lineFromOffset(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

export function parseJsonc<T = unknown>(text: string): JsoncParseResult<T> {
  const rawErrors: ParseError[] = [];
  const value = parse(text, rawErrors, { allowTrailingComma: true }) as T;
  const errors = rawErrors.map((error) => ({
    message: printParseErrorCode(error.error),
    line: lineFromOffset(text, error.offset),
  }));
  return { value: errors.length > 0 ? undefined : value, errors };
}

const FORMATTING_OPTIONS = { insertSpaces: true, tabSize: 2, eol: '\n' };

export function setJsoncValue(text: string, path: (string | number)[], value: unknown): string {
  const edits = modify(text, path, value, { formattingOptions: FORMATTING_OPTIONS });
  return applyEdits(text, edits);
}

export function insertJsoncArrayItem(
  text: string,
  path: (string | number)[],
  index: number,
  value: unknown,
): string {
  const edits = modify(text, [...path, index], value, {
    isArrayInsertion: true,
    formattingOptions: FORMATTING_OPTIONS,
  });
  return applyEdits(text, edits);
}
