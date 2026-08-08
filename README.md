# vscode-autoconfig

[![CI](https://github.com/RKasai127/vscode-autoconfig/actions/workflows/ci.yml/badge.svg)](https://github.com/RKasai127/vscode-autoconfig/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/vscode-autoconfig.svg)](https://www.npmjs.com/package/vscode-autoconfig)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Analyze your project's manifest files (`package.json`, `requirements.txt`, `pyproject.toml`, ...) and generate `.vscode/settings.json` + `.vscode/extensions.json` recommendations — using a plain rule table.

## Usage

```bash
npx vscode-autoconfig          # dry-run: shows what would change, writes nothing
npx vscode-autoconfig --write  # applies the changes shown by the dry-run above
```

The dry-run is always the default. Nothing is ever written to disk unless you pass `--write` (or `-w`).

### Example dry-run output

```
vscode-autoconfig — dry run (no files written)

Detected
  node    typescript (devDependency)
  node    react (dependency)

.vscode/settings.json (will be created)
  + typescript.tsdk: "node_modules/typescript/lib"

.vscode/extensions.json (will be created)
  + dbaeumer.vscode-eslint
  + dsznajder.es7-react-js-snippets

2 settings, 2 extensions would be added.
Run again with --write to apply.
```

## Flags

| Flag                  | Description                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `-w, --write`         | Apply changes. Without it, the command only previews changes (dry-run).                                       |
| `--ecosystems <list>` | Comma-separated list of ecosystems to detect, e.g. `--ecosystems node`. Defaults to all supported ecosystems. |
| `--rules <path>`      | Path to an external rule file (JSON or YAML). Merged with the built-in rules by default.                      |
| `--no-builtin-rules`  | Ignore the built-in rules; use only the file passed via `--rules`.                                            |
| `--json`              | Print machine-readable JSON instead of the terminal report.                                                   |

There is intentionally no `--cwd` flag: the tool always operates on the current directory. `cd` into the project you want to configure before running it.

## How it works

1. **Detectors** scan the current directory (non-recursively — files inside `node_modules/`, `.venv/`, etc. are never inspected) and produce a flat list of _findings_: which manifest files exist, which dependencies/devDependencies are declared, which config files are present.
2. **Rules** (plain JSON, see `src/rules/*.json`) declare a condition over findings and, when satisfied, contribute VS Code settings and/or extension recommendations.
3. The matched rules are aggregated into one settings patch and one extension list, then merged into your existing `.vscode/settings.json` / `.vscode/extensions.json` — additively, never overwriting a value you already set.

### Supported ecosystems (v1)

- **Node.js** — `package.json` dependencies/devDependencies, plus common config files (`tsconfig.json`, ESLint/Prettier configs).
- **Python** — `requirements.txt` and `pyproject.toml` (both PEP 621 `project.dependencies` and Poetry's `tool.poetry.dependencies`).

## Merging behavior

- Settings/extensions you already have are **never overwritten**. Only missing keys/extensions are added.
- For `.vscode/extensions.json`, if you manually remove an ID from `recommendations`, it will simply be re-added the next time you run `--write` (deletions are not tracked). If you don't want an extension recommended again, add it to `unwantedRecommendations` yourself.
- Rules are merged in a fixed order (built-in rules, then any `--rules` file). If two rules propose conflicting values for the same settings key, the first one wins and the rest are reported as skipped — nothing is silently overwritten.

## External rule files (`--rules`)

External rule files (JSON or YAML) let you extend or fully replace the built-in rule table without forking this tool. **Only use rule files from sources you trust** — treat them like any other executable configuration you'd run on your machine, and never run one handed to you by someone you don't trust.

## License

MIT
