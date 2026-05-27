import type {
  Finding,
  FleetReport,
  FleetSummaryRow,
  PiiExposure,
  SideEffectClass,
  ToolCard
} from "./types.js";

function emptySideEffectCounts(): Record<SideEffectClass, number> {
  return { read: 0, mutating: 0, external: 0, destructive: 0 };
}
function emptyPiiCounts(): Record<PiiExposure | "unset", number> {
  return { none: 0, low: 0, medium: 0, high: 0, unset: 0 };
}

export function summarize(cards: ToolCard[], now?: string): FleetReport {
  const generatedAt = now ?? new Date().toISOString();
  const rows: FleetSummaryRow[] = [];
  const findings: Finding[] = [];
  const bySideEffect = emptySideEffectCounts();
  const byPiiExposure = emptyPiiCounts();
  let destructiveTools = 0;
  let toolsRequiringApproval = 0;
  let toolsWithAudit = 0;
  let toolsWithTestedWith = 0;

  for (const c of cards) {
    if (!c.tool || !c.safety) continue;
    const id = `${c.tool.server_id}:${c.tool.name}@${c.tool.version}`;
    const sideEffect = c.safety.side_effect_class;
    const piiExposure: PiiExposure | "unset" = c.safety.pii_exposure ?? "unset";
    const humanApproval = c.safety.human_approval_required === true;
    const hasAudit = !!c.audit?.log_uri;
    const tested = c.tested_with ?? [];
    const hasTestedWith = tested.length > 0;

    if (sideEffect in bySideEffect) bySideEffect[sideEffect] += 1;
    if (piiExposure in byPiiExposure) byPiiExposure[piiExposure] += 1;
    if (sideEffect === "destructive") destructiveTools += 1;
    if (humanApproval) toolsRequiringApproval += 1;
    if (hasAudit) toolsWithAudit += 1;
    if (hasTestedWith) toolsWithTestedWith += 1;

    rows.push({
      id,
      serverId: c.tool.server_id,
      toolName: c.tool.name,
      version: c.tool.version,
      sideEffect,
      piiExposure,
      humanApproval,
      hasAudit,
      hasTestedWith,
      testedSuites: tested.length
    });

    // ─── findings ──
    if (sideEffect === "destructive") {
      if (!humanApproval) {
        findings.push({
          code: "destructive-without-human-approval",
          severity: "high",
          message: `Destructive tool has no safety.human_approval_required: true (spec allOf clause).`,
          subject: id,
          subjectName: c.tool.name
        });
      }
      if (!hasAudit) {
        findings.push({
          code: "destructive-without-audit-log",
          severity: "high",
          message: `Destructive tool has no audit.log_uri.`,
          subject: id,
          subjectName: c.tool.name
        });
      }
      if (!c.audit?.incident_response_uri) {
        findings.push({
          code: "destructive-without-incident-response-uri",
          severity: "medium",
          message: `Destructive tool has no audit.incident_response_uri.`,
          subject: id,
          subjectName: c.tool.name
        });
      }
      if (!c.safety.refusal_modes || c.safety.refusal_modes.length === 0) {
        findings.push({
          code: "no-refusal-modes-on-destructive",
          severity: "medium",
          message: `Destructive tool declares no safety.refusal_modes.`,
          subject: id,
          subjectName: c.tool.name
        });
      }
    }
    if (piiExposure === "high" && c.safety.rate_limited !== true) {
      findings.push({
        code: "high-pii-without-rate-limit",
        severity: "high",
        message: `Tool with pii_exposure=high does not declare safety.rate_limited: true.`,
        subject: id,
        subjectName: c.tool.name
      });
    }
    if (c.safety.secrets_exposure === "writes_secret_material" && !hasAudit) {
      findings.push({
        code: "writes-secrets-without-audit-log",
        severity: "high",
        message: `Tool writes secret material but has no audit.log_uri.`,
        subject: id,
        subjectName: c.tool.name
      });
    }
    if (!hasTestedWith) {
      findings.push({
        code: "no-tested-with",
        severity: sideEffect === "destructive" ? "medium" : "low",
        message: `Tool has no tested_with entries — recommended for callers to gate on.`,
        subject: id,
        subjectName: c.tool.name
      });
    }
    if (!c.performance) {
      findings.push({
        code: "no-performance-metrics",
        severity: "info",
        message: `Tool declares no performance latency metrics.`,
        subject: id,
        subjectName: c.tool.name
      });
    }
    if (!c.cost) {
      findings.push({
        code: "no-cost-metrics",
        severity: "info",
        message: `Tool declares no cost.per_call_usd.`,
        subject: id,
        subjectName: c.tool.name
      });
    }
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  const ok = !findings.some((f) => f.severity === "high");

  return {
    generatedAt,
    cards: rows.length,
    bySideEffect,
    byPiiExposure,
    destructiveTools,
    toolsRequiringApproval,
    toolsWithAudit,
    toolsWithTestedWith,
    rows,
    findings,
    ok
  };
}
