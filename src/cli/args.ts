import { Command } from 'commander';

export interface CliArgs {
  write: boolean;
  ecosystems?: string[];
  rules?: string;
  builtinRules: boolean;
  json: boolean;
}

export interface RawCliOptions {
  write: boolean;
  ecosystems?: string;
  rules?: string;
  builtinRules: boolean;
  json: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const program = new Command();

  program
    .name('vscode-autoconfig')
    .description(
      "Analyze your project's manifests and generate .vscode/settings.json + extensions.json recommendations",
    )
    .option('-w, --write', 'apply changes (default: dry-run only, writes nothing)', false)
    .option('--ecosystems <list>', 'comma-separated list of ecosystems to detect (node,python)')
    .option(
      '--rules <path>',
      'path to an external rule file (JSON or YAML), merged with the built-in rules',
    )
    .option('--no-builtin-rules', 'ignore the built-in rules; use only the file passed via --rules')
    .option('--json', 'output machine-readable JSON instead of a terminal report', false)
    .version('0.1.0');

  program.parse(argv);

  const opts = program.opts<RawCliOptions>();

  return {
    write: opts.write,
    ecosystems: opts.ecosystems
      ? opts.ecosystems
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    rules: opts.rules,
    builtinRules: opts.builtinRules,
    json: opts.json,
  };
}
