# Oracle cross-check

Compared against reaganthomas/crap4ts (community crap4clj port, npm package `crap4ts` v1.0.1) on tests/fixtures/project.

Result: 2026-09-12 — scores agree: add 2, scale 12, boom 42.

## How the oracle was run

The installed oracle does not support the README flags `--lcov` / `--no-run`; its actual
interface is `crap4ts -s <src paths...> -c <coverage JSON>` and it only accepts Istanbul
JSON (`coverage-final.json`) or V8 JSON, not lcov. The fixture's `coverage/lcov.info`
was therefore converted faithfully to Istanbul JSON before invoking the oracle
(temp file `/tmp/crap4ts-oracle/coverage-final.json`, not committed). The conversion
mirrors the lcov record exactly:

- `FN:1,add / FNDA:5` → fnMap `add` (lines 1–6), all statements in span covered
- `FN:6,scale / FNDA:0` → fnMap `scale` (lines 8–15), all statements in span uncovered
- `FN:12,boom / FNDA:0` → fnMap `boom` (lines 17–25), all statements in span uncovered

The oracle derives per-function line coverage from `statementMap`/`s` within each
`fnMap` span, so this reproduces the lcov semantics (add 100%, scale 0%, boom 0%).

## Commands and outputs

Oracle (v1.0.1, run from repo root):

```
node /tmp/crap4ts-oracle/node_modules/crap4ts/dist/cli.js -s tests/fixtures/project/src -c /tmp/crap4ts-oracle/coverage-final.json

 File                                Function    CC    Cov%    CRAP
 ──────────────────────────────────  ────────  ────  ──────  ──────
 tests/fixtures/project/src/math.ts  add          2   100.0     2.0
 tests/fixtures/project/src/math.ts  scale        3     0.0    12.0
 tests/fixtures/project/src/math.ts  boom         6     0.0    42.0
```

Ours (after `npm run build`):

```
node dist/cli.js --source-root tests/fixtures/project/src --lcov tests/fixtures/project/coverage/lcov.info --use-existing-coverage

Function | File                               | CC | Cov% | CRAP
boom     | tests/fixtures/project/src/math.ts | 6  | 0    | 42.00
scale    | tests/fixtures/project/src/math.ts | 3  | 0    | 12.00
add      | tests/fixtures/project/src/math.ts | 2  | 100  | 2.00
```

Function-by-function: CC (2/3/6), coverage (100/0/0), and CRAP (2.00/12.00/42.00)
all agree with each other and with the hand-computed values. No divergences found.
