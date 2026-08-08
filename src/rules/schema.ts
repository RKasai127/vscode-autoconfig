import { z } from 'zod';
import { RULE_SCHEMA_VERSION } from '../core/types.js';

const ecosystemSchema = z.enum(['node', 'python']);
const findingKindSchema = z.enum([
  'dependency',
  'devDependency',
  'manifestPresence',
  'configFilePresence',
  'scriptPresence',
]);

const findingMatcherSchema = z
  .object({
    ecosystem: ecosystemSchema.optional(),
    kind: findingKindSchema.optional(),
    name: z.string().optional(),
  })
  .strict();

const jsonValueSchema: z.ZodType<import('../core/types.js').JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

const ruleConditionSchema: z.ZodType<import('../core/types.js').RuleCondition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(ruleConditionSchema) }).strict(),
    z.object({ any: z.array(ruleConditionSchema) }).strict(),
    z.object({ not: ruleConditionSchema }).strict(),
    findingMatcherSchema,
  ]),
);

const ruleSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),
  when: ruleConditionSchema,
  settings: z.record(jsonValueSchema).optional(),
  extensions: z.array(z.string()).optional(),
});

export const ruleFileSchema = z
  .object({
    schemaVersion: z.number().int(),
    rules: z.array(ruleSchema),
  })
  .superRefine((file, ctx) => {
    if (file.schemaVersion !== RULE_SCHEMA_VERSION) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schemaVersion'],
        message: `This rule file has schemaVersion ${file.schemaVersion}, but this tool only supports version ${RULE_SCHEMA_VERSION}.`,
      });
    }

    const seenIds = new Set<string>();
    for (const [index, rule] of file.rules.entries()) {
      if (seenIds.has(rule.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rules', index, 'id'],
          message: `Rule id "${rule.id}" is duplicated. Rule ids must be unique.`,
        });
      }
      seenIds.add(rule.id);
    }
  });
