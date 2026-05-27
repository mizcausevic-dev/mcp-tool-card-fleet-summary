import type { FindingSeverity, FleetReport } from "./types.js";

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  high: "🔴 high",
  medium: "🟠 medium",
  low: "🟡 low",
  info: "ℹ️  info"
};
const SEVERITY_RANK: Record<FindingSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };

export function toMarkdown(report: FleetReport): string {
  const lines: string[] = [];
  lines.push(report.ok ? `# MCP Tool Card fleet summary ✅` : `# MCP Tool Card fleet summary ❌`);
  lines.push(``);
  lines.push(`Generated: \`${report.generatedAt}\``);
  lines.push(``);
  lines.push(`## Fleet`);
  lines.push(``);
  lines.push(`- Tool cards: **${report.cards}** · Destructive: ${report.destructiveTools} · Requires approval: ${report.toolsRequiringApproval} · Audited: ${report.toolsWithAudit} · Tested-with: ${report.toolsWithTestedWith}`);
  const s = report.bySideEffect;
  lines.push(
    `- Side effect: read=${s.read} · mutating=${s.mutating} · external=${s.external} · destructive=${s.destructive}`
  );
  const p = report.byPiiExposure;
  lines.push(
    `- PII exposure: none=${p.none} · low=${p.low} · medium=${p.medium} · high=${p.high} · unset=${p.unset}`
  );
  lines.push(``);
  lines.push(`## Per tool`);
  lines.push(``);
  lines.push(`| tool | side effect | PII | approval | audit | tested-with |`);
  lines.push(`|---|---|---|:---:|:---:|---:|`);
  for (const r of report.rows) {
    lines.push(
      `| \`${r.id}\` | ${r.sideEffect} | ${r.piiExposure} | ${r.humanApproval ? "✓" : "—"} | ${r.hasAudit ? "✓" : "—"} | ${r.testedSuites} |`
    );
  }

  const ranked = [...report.findings].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  if (ranked.length > 0) {
    lines.push(``);
    lines.push(`## Findings (${ranked.length})`);
    lines.push(``);
    lines.push(`| severity | code | tool | message |`);
    lines.push(`|---|---|---|---|`);
    for (const f of ranked) {
      lines.push(`| ${SEVERITY_LABEL[f.severity]} | \`${f.code}\` | ${f.subjectName ?? f.subject} | ${f.message} |`);
    }
  } else {
    lines.push(``);
    lines.push(`No findings.`);
  }
  return lines.join("\n");
}

export function toSummary(report: FleetReport): string {
  const counts: Record<FindingSeverity, number> = { high: 0, medium: 0, low: 0, info: 0 };
  for (const f of report.findings) counts[f.severity] += 1;
  return `${report.cards} card${report.cards === 1 ? "" : "s"} · ${report.destructiveTools} destructive · ${report.toolsWithAudit} audited · ${counts.high} high · ${counts.medium} medium (${report.ok ? "ok" : "fail"})`;
}
