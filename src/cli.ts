import { parseArgs } from './cli/args.js';
import { run } from './cli/run.js';

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv);

  const runResutl = run({
    cwd: process.cwd(),
    write: cliArgs.write,
    ecosystems: cliArgs.ecosystems,
    rulesPath: cliArgs.rules,
    builtinRules: cliArgs.builtinRules,
    json: cliArgs.json,
  });

  console.log(runResutl.output);
  process.exitCode = runResutl.exitCode;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
});
