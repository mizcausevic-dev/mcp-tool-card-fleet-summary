# mcp-tool-card-fleet-summary

[![CI](https://github.com/mizcausevic-dev/mcp-tool-card-fleet-summary/actions/workflows/ci.yml/badge.svg)](https://github.com/mizcausevic-dev/mcp-tool-card-fleet-summary/actions/workflows/ci.yml)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue.svg)](LICENSE)

Fleet-analyze a directory of [MCP Tool Card](https://github.com/mizcausevic-dev/mcp-tool-card-spec) documents. Counts by side-effect class, PII and secrets exposure, reversibility, and approval, surfaces the governance gaps that hurt an audit — destructive tools without human approval / audit log / incident-response URI, high-PII tools without rate limiting, secret-writing tools without an audit log, tools without `tested_with` evidence.

Makes the fleet-summary tool family a quartet:

- [`agent-card-fleet-summary`](https://github.com/mizcausevic-dev/agent-card-fleet-summary) — A2A AgentCards
- **`mcp-tool-card-fleet-summary`** — MCP Tool Cards
- [`prompt-provenance-fleet-summary`](https://github.com/mizcausevic-dev/prompt-provenance-fleet-summary) — prompt provenance docs
- [`evidence-bundle-fleet-summary`](https://github.com/mizcausevic-dev/evidence-bundle-fleet-summary) — evidence bundles

Part of the [Kinetic Gain Suite](https://suite.kineticgain.com/).

---

## What it flags

| Code | Severity | Rule |
|---|---|---|
| `destructive-without-human-approval` | 🔴 | `side_effect_class=destructive` but `safety.human_approval_required` is not `true` (the spec's allOf clause). |
| `destructive-without-audit-log` | 🔴 | Destructive tool has no `audit.log_uri`. |
| `high-pii-without-rate-limit` | 🔴 | `pii_exposure=high` but `safety.rate_limited` is not `true`. |
| `writes-secrets-without-audit-log` | 🔴 | `secrets_exposure=writes_secret_material` but no `audit.log_uri`. |
| `destructive-without-incident-response-uri` | 🟠 | Destructive tool has no `audit.incident_response_uri`. |
| `no-refusal-modes-on-destructive` | 🟠 | Destructive tool declares no `safety.refusal_modes`. |
| `no-tested-with` | 🟠 on destructive / 🟡 elsewhere | Tool has no `tested_with` evidence. |
| `no-performance-metrics` | ℹ️ | No `performance.p*_latency_ms`. |
| `no-cost-metrics` | ℹ️ | No `cost.per_call_usd`. |

## CLI

```
npx mcp-tool-card-fleet-summary <cards-dir>
    [--format json|markdown|summary]
    [--now <iso>]
    [--fail-on-high] [--fail-on-gaps]
    [--out FILE]
```

Exit codes:

- `0` — no findings selected by an enabled gate
- `1` — high finding with `--fail-on-high`, or a destructive approval gap with `--fail-on-gaps`
- `2` — usage / I/O error

## Library

```ts
import { summarize, toMarkdown } from "mcp-tool-card-fleet-summary";

const report = summarize(cards);
console.log(report.bySideEffect);     // { read, mutating, external, destructive }
console.log(report.byPiiExposure);    // { none, low, medium, high, unset }
console.log(report.bySecretsExposure); // { none, reads_secret_material, writes_secret_material, handles_keys, unset }
console.log(report.reversibleTools);   // declared reversible cards
console.log(report.findings);
console.log(toMarkdown(report));
```

## Migration from `mcp-tool-card-summary`

The earlier package also analyzes a directory of cards. This package adds audit and tested-with findings, but its JSON, TypeScript, Markdown, and one-line output are **not drop-in compatible**. Update consumers explicitly:

| Earlier report | This report |
|---|---|
| `byPii` | `byPiiExposure` (includes `unset`) |
| `bySecrets` | `bySecretsExposure` (includes `unset`) |
| `reversibleCount` | `reversibleTools` |
| `humanApprovalRequiredCount` | `toolsRequiringApproval` |
| `approvalGaps` | Filter `findings` for `destructive-without-human-approval` |
| `rows[].rate_limited` | `rows[].rateLimited` |
| `--fail-on-gaps` | Same targeted gate; `--fail-on-high` additionally gates all high findings |

The older row identifier is `server_id/name`; this package uses `server_id:name@version`. Do not archive the earlier repository until consumers and links are migrated and an exact fixture comparison is reviewed.

## Composes with

- [**`mcp-tool-card-spec`**](https://github.com/mizcausevic-dev/mcp-tool-card-spec) — the schema this reads.
- [**`mcp-tool-card-stamp`**](https://github.com/mizcausevic-dev/mcp-tool-card-stamp) — build the cards this analyzes.
- [**`mcp-tool-card-diff`**](https://github.com/mizcausevic-dev/mcp-tool-card-diff) — diff two cards across versions.
- [**`mcp-tool-card-summary`**](https://github.com/mizcausevic-dev/mcp-tool-card-summary) — earlier directory-level analyzer; review consumer migration before retirement.
- [**`agent-card-fleet-summary`**](https://github.com/mizcausevic-dev/agent-card-fleet-summary), [**`prompt-provenance-fleet-summary`**](https://github.com/mizcausevic-dev/prompt-provenance-fleet-summary), [**`evidence-bundle-fleet-summary`**](https://github.com/mizcausevic-dev/evidence-bundle-fleet-summary) — siblings across the suite.

## License

[AGPL-3.0-or-later](LICENSE)
