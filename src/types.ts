// Fleet-analyze a directory of MCP Tool Card documents.
// Subset of mcp-tool-card-spec v0.1 used for analysis.

export type SideEffectClass = "read" | "mutating" | "external" | "destructive";
export type PiiExposure = "none" | "low" | "medium" | "high";
export type SecretsExposure = "none" | "reads_secret_material" | "writes_secret_material";

export interface ToolCard {
  tool_card_version: string;
  tool: { server_id: string; name: string; version: string; mcp_server_uri: string; description: string };
  schema: { input_schema_inline?: Record<string, unknown>; input_schema_uri?: string };
  safety: {
    side_effect_class: SideEffectClass;
    external_systems?: string[];
    reversible?: boolean;
    rate_limited?: boolean;
    pii_exposure?: PiiExposure;
    secrets_exposure?: SecretsExposure;
    human_approval_required?: boolean;
    refusal_modes?: string[];
  };
  tested_with?: Array<{ llm: string; pass_rate?: number; sample_size?: number; tested_at?: string }>;
  performance?: { p50_latency_ms?: number; p95_latency_ms?: number; p99_latency_ms?: number };
  cost?: { per_call_usd?: number };
  audit?: { log_uri?: string; retention_days?: number; signed_by?: string; incident_response_uri?: string };
}

export type FindingSeverity = "high" | "medium" | "low" | "info";

export type FindingCode =
  | "destructive-without-human-approval"
  | "destructive-without-audit-log"
  | "destructive-without-incident-response-uri"
  | "high-pii-without-rate-limit"
  | "writes-secrets-without-audit-log"
  | "no-tested-with"
  | "no-refusal-modes-on-destructive"
  | "no-performance-metrics"
  | "no-cost-metrics";

export interface Finding {
  code: FindingCode;
  severity: FindingSeverity;
  message: string;
  subject: string;
  subjectName?: string;
}

export interface FleetSummaryRow {
  /** "<server_id>:<tool.name>@<tool.version>" */
  id: string;
  serverId: string;
  toolName: string;
  version: string;
  sideEffect: SideEffectClass;
  piiExposure: PiiExposure | "unset";
  humanApproval: boolean;
  hasAudit: boolean;
  hasTestedWith: boolean;
  testedSuites: number;
}

export interface FleetReport {
  generatedAt: string;
  cards: number;
  bySideEffect: Record<SideEffectClass, number>;
  byPiiExposure: Record<PiiExposure | "unset", number>;
  destructiveTools: number;
  toolsRequiringApproval: number;
  toolsWithAudit: number;
  toolsWithTestedWith: number;
  rows: FleetSummaryRow[];
  findings: Finding[];
  ok: boolean;
}
