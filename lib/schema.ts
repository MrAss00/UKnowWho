import { z } from "zod";

export const ScanRequestSchema = z.object({
  content: z.string().trim().min(1, "Paste something to scan").max(50_000),
  rawHeaders: z.string().max(100_000).optional(),
  imageBase64: z.string().max(15_000_000).optional(),
  imageMediaType: z
    .enum(["image/png", "image/jpeg", "image/webp", "image/gif"])
    .optional(),
});
export type ScanRequest = z.infer<typeof ScanRequestSchema>;

export const SeveritySchema = z.enum(["low", "medium", "high"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const VerdictSchema = z.enum(["safe", "caution", "dangerous"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const ScamCategorySchema = z.enum([
  "phishing",
  "impersonation",
  "romance_scam",
  "job_scam",
  "investment_scam",
  "tech_support_scam",
  "prize_scam",
  "extortion",
  "payment_fraud",
  "legitimate",
  "unknown",
]);
export type ScamCategory = z.infer<typeof ScamCategorySchema>;

export const RedFlagSchema = z.object({
  quote: z
    .string()
    .describe("Exact phrase from the message that is suspicious"),
  explanation: z
    .string()
    .describe("Why this phrase is a red flag, in plain language"),
  severity: SeveritySchema,
});
export type RedFlag = z.infer<typeof RedFlagSchema>;

/** What Claude returns — constrained via structured outputs. */
export const AiAnalysisSchema = z.object({
  risk_score: z
    .number()
    .describe("0 (clearly safe) to 100 (certain scam)"),
  scam_category: ScamCategorySchema,
  confidence: z.enum(["low", "medium", "high"]),
  summary: z
    .string()
    .describe("2-3 sentence technical assessment of the message"),
  grandma_summary: z
    .string()
    .describe(
      "The same verdict explained for a non-technical person: short, warm, no jargon",
    ),
  red_flags: z.array(RedFlagSchema),
  advice: z
    .array(z.string())
    .describe("Concrete next steps for the recipient, most important first"),
});
export type AiAnalysis = z.infer<typeof AiAnalysisSchema>;

/** One signal produced by the deterministic forensics layer. */
export const ForensicSignalSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  severity: SeveritySchema,
  /** Points added to the blended risk score. */
  weight: z.number(),
});
export type ForensicSignal = z.infer<typeof ForensicSignalSchema>;

/** The unified response returned by POST /api/scan. */
export const RiskReportSchema = z.object({
  verdict: VerdictSchema,
  risk_score: z.number(),
  ai: AiAnalysisSchema.nullable(),
  /** Set when the AI layer was skipped or failed; explains why. */
  ai_notice: z.string().nullable(),
  forensics: z.object({
    signals: z.array(ForensicSignalSchema),
    links: z.array(
      z.object({
        url: z.string(),
        domain: z.string(),
        flags: z.array(z.string()),
        severity: SeveritySchema,
      }),
    ),
    headers: z
      .object({
        from: z.string().nullable(),
        replyTo: z.string().nullable(),
        returnPath: z.string().nullable(),
        spf: z.string().nullable(),
        dkim: z.string().nullable(),
        dmarc: z.string().nullable(),
      })
      .nullable(),
  }),
  scanned_at: z.string(),
});
export type RiskReport = z.infer<typeof RiskReportSchema>;

export function verdictForScore(score: number): Verdict {
  if (score >= 60) return "dangerous";
  if (score >= 30) return "caution";
  return "safe";
}
