# Upstream provenance

crap4ts is a TypeScript port of unclebob's crap4clj. This file records which
upstream revision the port was derived from and every subsequent upstream
review, so changes upstream can be evaluated and integrated deliberately.

## Sources

| Name | Repo | Branch | Recorded revision (derived from) |
|------|------|--------|----------------------------------|
| upstream   | https://github.com/unclebob/crap4clj    | master | `e068673a852a8142323ac680fa3366de65bc2227` |
| swarmforge | https://github.com/unclebob/swarm-forge | main   | `f4f5fbcae0de6f7dcc26e82400334227647cfdb2` |

- `upstream` is the algorithm source this port implements: the CRAP formula
  `CRAP(f) = CC² × (1 − coverage)³ + CC`, the decision-point table behind CC,
  LCOV-based per-function coverage join, risk bands (≤5 low / ≤30 moderate /
  >30 high / N/A unknown), and the worst-first text report + JSON output.
- `swarmforge` hosts the engineering.prompt constitution that references this
  toolset; watch it for contract changes (tool table rows, guardrails).

The same revisions are recorded in machine-readable form in `.upstream`
(one `<name> <remote> <branch> <sha>` line each), which
`scripts/check-upstream.sh` reads.

## Checking for changes

    scripts/check-upstream.sh

An `unchanged` line per repo means nothing moved. When a repo has moved, the
script lists the new commits. Evaluate each change for relevance to this port,
then record the outcome:

1. Update the SHA in `.upstream` (and the table above) to the new revision.
2. Append a row to the decision log below.

## Decision log

| Date | Upstream | Revision | Changes observed | Verdict |
|------|----------|----------|------------------|---------|
| 2026-09-13 | upstream | `e068673…` | initial derivation: port implemented, formula/decision table/join/bands verified against oracle crap4ts@1.0.1 | derived |
| 2026-09-13 | swarmforge | `f4f5fbc…` | engineering.prompt tool table read; TypeScript row absent (this port fills it) | derived |

