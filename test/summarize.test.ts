import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { summarize } from "../src/summarize.js";
import { toMarkdown, toSummary } from "../src/format.js";
import type { ToolCard } from "../src/types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const NOW = "2026-05-26T20:00:00Z";

function loadFleet(): ToolCard[] {
  const dir = `${here}/../fixtures/cards`;
  const out: ToolCard[] = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".json")) continue;
    out.push(JSON.parse(readFileSync(`${dir}/${entry}`, "utf8")) as ToolCard);
  }
  return out;
}

describe("summarize", () => {
  it("counts the full fleet by side effect", () => {
    const r = summarize(loadFleet(), NOW);
    expect(r.cards).toBe(5);
    expect(r.bySideEffect.read).toBe(2);
    expect(r.bySideEffect.mutating).toBe(1);
    expect(r.bySideEffect.destructive).toBe(2);
    expect(r.destructiveTools).toBe(2);
    expect(r.toolsRequiringApproval).toBe(1);
  });

  it("counts by pii_exposure including unset", () => {
    const r = summarize(loadFleet(), NOW);
    expect(r.byPiiExposure.low).toBe(1);
    expect(r.byPiiExposure.medium).toBe(2);
    expect(r.byPiiExposure.high).toBe(2);
  });

  it("flags destructive-without-human-approval (high)", () => {
    const r = summarize(loadFleet(), NOW);
    const codes = r.findings.filter((f) => f.subject.includes("force-delete")).map((f) => f.code);
    expect(codes).toContain("destructive-without-human-approval");
    expect(codes).toContain("destructive-without-audit-log");
    expect(codes).toContain("destructive-without-incident-response-uri");
    expect(codes).toContain("no-refusal-modes-on-destructive");
  });

  it("flags high-pii-without-rate-limit (high) on unrate-limited high-PII tools", () => {
    const r = summarize(loadFleet(), NOW);
    const codes = r.findings.filter((f) => f.subject.includes("lookup-customer")).map((f) => f.code);
    expect(codes).toContain("high-pii-without-rate-limit");
  });

  it("flags writes-secrets-without-audit-log (high)", () => {
    const r = summarize(loadFleet(), NOW);
    const codes = r.findings.filter((f) => f.subject.includes("rotate-key")).map((f) => f.code);
    expect(codes).toContain("writes-secrets-without-audit-log");
  });

  it("flags no-tested-with at medium on destructive, low elsewhere", () => {
    const r = summarize(loadFleet(), NOW);
    const f = r.findings.filter((x) => x.code === "no-tested-with");
    // force-delete + rotate-key both lack tested_with
    expect(f.length).toBeGreaterThanOrEqual(2);
    const sev = new Map(f.map((x) => [x.subject, x.severity]));
    expect(sev.get("kg-bad-mcp:force-delete@0.1.0")).toBe("medium");
    expect(sev.get("kg-creds-mcp:rotate-key@0.4.0")).toBe("low");
  });

  it("does not flag the clean read tool with everything declared", () => {
    const r = summarize(loadFleet(), NOW);
    const codes = r.findings
      .filter((f) => f.subject === "kg-research-mcp:search-vectorstore@1.0.0")
      .map((f) => f.code);
    expect(codes).not.toContain("destructive-without-human-approval");
    expect(codes).not.toContain("high-pii-without-rate-limit");
    expect(codes).not.toContain("no-tested-with");
  });

  it("does not flag the destructive-clean tool for destructive-* findings", () => {
    const r = summarize(loadFleet(), NOW);
    const codes = r.findings
      .filter((f) => f.subject === "kg-admin-mcp:tenant-reset@0.3.0")
      .map((f) => f.code);
    expect(codes).not.toContain("destructive-without-human-approval");
    expect(codes).not.toContain("destructive-without-audit-log");
    expect(codes).not.toContain("destructive-without-incident-response-uri");
    expect(codes).not.toContain("no-refusal-modes-on-destructive");
  });

  it("ok=false on the fleet (multiple high findings)", () => {
    const r = summarize(loadFleet(), NOW);
    expect(r.ok).toBe(false);
  });

  it("ok=true when fleet has no high findings", () => {
    const clean: ToolCard = {
      tool_card_version: "0.1",
      tool: { server_id: "x", name: "ping", version: "1.0.0", mcp_server_uri: "https://x/", description: "ping" },
      schema: { input_schema_inline: { type: "object" } },
      safety: { side_effect_class: "read", pii_exposure: "none", rate_limited: true },
      tested_with: [{ llm: "claude-sonnet-4", pass_rate: 1.0 }],
      performance: { p50_latency_ms: 10 },
      cost: { per_call_usd: 0.00001 }
    };
    const r = summarize([clean], NOW);
    expect(r.ok).toBe(true);
  });

  it("ignores cards missing required blocks", () => {
    const r = summarize([{} as ToolCard, { tool: { server_id: "x", name: "y", version: "1", mcp_server_uri: "u", description: "d" } } as ToolCard], NOW);
    expect(r.cards).toBe(0);
  });

  it("rows are sorted by id", () => {
    const r = summarize(loadFleet(), NOW);
    const ids = r.rows.map((row) => row.id);
    expect([...ids].sort()).toEqual(ids);
  });

  it("uses provided now over Date.now()", () => {
    const r = summarize(loadFleet(), "2030-01-01T00:00:00Z");
    expect(r.generatedAt).toBe("2030-01-01T00:00:00Z");
  });

  it("toMarkdown renders the fail banner with per-tool table and findings", () => {
    const md = toMarkdown(summarize(loadFleet(), NOW));
    expect(md).toContain("# MCP Tool Card fleet summary ❌");
    expect(md).toContain("## Per tool");
    expect(md).toContain("`kg-research-mcp:search-vectorstore@1.0.0`");
    expect(md).toContain("## Findings");
  });

  it("toMarkdown renders the success banner + 'No findings' when clean", () => {
    const clean: ToolCard = {
      tool_card_version: "0.1",
      tool: { server_id: "x", name: "ping", version: "1.0.0", mcp_server_uri: "https://x/", description: "ping" },
      schema: { input_schema_inline: { type: "object" } },
      safety: { side_effect_class: "read", pii_exposure: "none", rate_limited: true },
      tested_with: [{ llm: "claude-sonnet-4", pass_rate: 1.0 }],
      performance: { p50_latency_ms: 10 },
      cost: { per_call_usd: 0.00001 }
    };
    const md = toMarkdown(summarize([clean], NOW));
    expect(md).toContain("✅");
    expect(md).toContain("No findings.");
  });

  it("toSummary line-formats counts and singular/plural + ok/fail", () => {
    const s = toSummary(summarize(loadFleet(), NOW));
    expect(s).toContain("5 cards");
    expect(s).toContain("2 destructive");
    expect(s).toContain("(fail)");

    const clean: ToolCard = {
      tool_card_version: "0.1",
      tool: { server_id: "x", name: "ping", version: "1.0.0", mcp_server_uri: "https://x/", description: "ping" },
      schema: { input_schema_inline: { type: "object" } },
      safety: { side_effect_class: "read", pii_exposure: "none", rate_limited: true },
      tested_with: [{ llm: "claude-sonnet-4", pass_rate: 1.0 }],
      performance: { p50_latency_ms: 10 },
      cost: { per_call_usd: 0.00001 }
    };
    expect(toSummary(summarize([clean], NOW))).toContain("1 card ·");
    expect(toSummary(summarize([clean], NOW))).toContain("(ok)");
  });
});
