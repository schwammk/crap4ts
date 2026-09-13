---
name: crap4ts
description: "Calculates cyclomatic complexity and CRAP scores for TypeScript functions by combining complexity analysis with Jest/istanbul test coverage data, generating sorted reports that identify high-risk under-tested code. Use when the user asks for a CRAP report, cyclomatic complexity analysis, or code quality metrics on a TypeScript project, or when a complexity/coverage gate must pass before code is considered done."
---

# crap4ts — CRAP Metric for TypeScript

Computes the **CRAP** (Change Risk Anti-Pattern) score for every function,
method, constructor, and accessor in a TypeScript project. CRAP combines
cyclomatic complexity with test coverage to identify functions that are both
complex and under-tested. Exit 1 means at least one function is over the
threshold — refactor (split the function; never lower the threshold) before
considering the work done.

## Usage

Coverage comes from Jest/istanbul LCOV (`lcov.info` per project). For Nx
monorepos, pass every project's lcov.info — repeat `--lcov` or use a glob:

```bash
# Single project: run tests with coverage first, then gate on the report
npx github:schwammk/crap4ts --source-root src --lcov coverage/lcov.info

# Nx monorepo (per-project coverage dirs get merged)
npx github:schwammk/crap4ts --source-root packages \
  --lcov "coverage/**/lcov.info" --use-existing-coverage --threshold 30

# Let the tool run the coverage command itself
npx github:schwammk/crap4ts --source-root packages \
  --lcov "coverage/**/lcov.info" \
  --coverage-command "nx run-many -t test --coverage"
```

### Output

A table sorted by CRAP score (worst first):

```
Function                  | File            | CC | Cov% | CRAP
boom                      | src/math.ts     | 6  | 0    | 42.00
scale                     | src/math.ts     | 3  | 0    | 12.00
add                       | src/math.ts     | 2  | 100  | 2.00
```

`--format json` emits the same data as a JSON array.

## Interpreting Scores

| CRAP Score | Meaning |
|-----------|---------|
| 1-5       | Clean — low complexity, well tested |
| 5-30      | Moderate — consider refactoring or adding tests |
| 30+       | Crappy — high complexity with poor coverage |

Exit codes: 0 = nothing over the threshold; 1 = at least one function over
the threshold (gate failure); 2 = config/tool error. N/A coverage never
gates — it warns on stderr instead.

## How It Works

1. Finds `.ts` files under the source root (skips tests, `.d.ts`,
   `node_modules`, `dist`, `coverage`)
2. Extracts functions/methods/constructors/accessors with the TypeScript
   compiler and counts decision points (if/else-if, ternary, `&&`/`||`/`??`,
   assignment-logical operators, loops, non-default cases, catch)
3. Parses and merges the LCOV file(s) and joins per function by
   file + name + start line
4. Applies the CRAP formula: `CC² × (1 - cov)³ + CC`
5. Sorts by CRAP score descending and prints the report

## Troubleshooting

- **Functions show N/A coverage**: the LCOV has no `FN`/`FNDA` entry for the
  function — typically bare arrow callbacks assigned inline; Istanbul-based
  coverage emits function entries for named functions. N/A never gates.
- **Coverage stale or missing**: run the test suite with coverage enabled
  first (`nx run-many -t test --coverage`), or pass `--coverage-command`.
- **Multiple projects, single report**: repeat `--lcov` (or use a glob) —
  per-project LCOV files are merged.
