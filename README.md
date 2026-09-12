# crap4ts

CRAP (Change Risk Anti-Pattern) metric for TypeScript. A port of
[crap4clj](https://github.com/unclebob/crap4clj) with crap4clj's CLI ergonomics.

CRAP(f) = CC² × (1 − coverage)³ + CC

- `CC` = decision points (if/else-if, ternary, && || ??, &&= ||= ??=, loops,
  case labels, catch) + 1
- `coverage` = function-level coverage from istanbul LCOV (`FN`/`FNDA`)
- Functions without coverage data are reported `N/A` and warned on stderr —
  never assumed covered.

Risk bands: ≤5 low, ≤30 moderate, >30 high.

## Install (git only, no npm)

    npx github:schwammk/crap4ts [options]

## Usage (Nx monorepo)

    npx github:schwammk/crap4ts \
      --source-root packages \
      --lcov coverage/*/impl/lcov.info \
      --coverage-command "nx run-many -t test --coverage" \
      --threshold 30

Or on existing coverage:

    npx github:schwammk/crap4ts --lcov coverage/app-1/impl/lcov.info --use-existing-coverage

## Options

    --source-root <dir>       sources to scan (default ./src)
    --lcov <path>             lcov.info path or glob; repeatable
    --coverage-command <cmd>  command that runs tests with coverage
    --use-existing-coverage   read LCOV only, run nothing
    --threshold <n>           exit 1 when any function exceeds it (default 30)
    --format <text|json>      report format (default text)

## Exit codes

    0  report produced, nothing over threshold
    1  report produced, at least one function over threshold
    2  configuration or tool error

## Development

    npm install
    npm test        # vitest suite
    npm run crap    # tests + coverage + dogfood CRAP gate on this repo

MIT.
