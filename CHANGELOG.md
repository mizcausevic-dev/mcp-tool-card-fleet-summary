# Changelog

## v0.1.0 — 2026-05-26

- Initial release: `summarize(cards, now?)` → `FleetReport` with per-side-effect counts + per-tool rows + finding list.
- 9 finding codes spanning destructive-tool hygiene (`destructive-without-human-approval`, `destructive-without-audit-log`, `destructive-without-incident-response-uri`, `no-refusal-modes-on-destructive`), data-class safety (`high-pii-without-rate-limit`, `writes-secrets-without-audit-log`), evaluation coverage (`no-tested-with` — severity scales with destructiveness), and completeness (`no-performance-metrics`, `no-cost-metrics`).
- 4 severity tiers (high / medium / low / info) in line with the suite's other fleet tools.
- Formatters: `toMarkdown(report)` and `toSummary(report)`.
- CLI: `mcp-tool-card-fleet-summary <cards-dir>` with `--format json|markdown|summary`, `--now <iso>`, `--fail-on-high`, `--out FILE`.
- 5-card fixture corpus spanning every side-effect class + every high finding code (clean read, clean destructive, no-approval destructive, high-PII unrate-limited, secret-writing without audit).
- Makes the fleet-summary tool family a quartet alongside `agent-card-fleet-summary`, `prompt-provenance-fleet-summary`, and `evidence-bundle-fleet-summary`.
- Node 20/22 CI (lint, typecheck, coverage, build, demo, `npm audit`), AGPL-3.0-or-later, Dependabot.
