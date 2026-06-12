import type {
  AiAnalysis,
  ForensicSignal,
  RiskReport,
  Verdict,
} from "@/lib/schema";
import { verdictForScore } from "@/lib/schema";
import type { HeaderAnalysis } from "@/lib/forensics/headers";
import type { LinkAnalysis } from "@/lib/forensics/links";

const AI_WEIGHT = 0.65;

/**
 * Blend the AI score with deterministic forensic signals so the verdict is
 * never purely "the LLM said so". Hard evidence (spoofed headers, lookalike
 * domains) can only push the score UP — a smooth-talking scam that fools the
 * model still gets flagged by the forensics, and a clean message is not
 * penalized for having no signals.
 */
export function blendScore(
  ai: AiAnalysis | null,
  signals: ForensicSignal[],
): { score: number; verdict: Verdict } {
  const signalPoints = signals.reduce((sum, s) => sum + s.weight, 0);

  let score: number;
  if (ai) {
    score = ai.risk_score * AI_WEIGHT + Math.min(signalPoints, 60);
  } else {
    // Forensics-only mode: signals carry full weight.
    score = Math.min(signalPoints * 1.5, 100);
  }

  // High-severity hard evidence sets a floor: spoofed mail or a lookalike
  // domain is never "safe" regardless of how benign the prose reads.
  const hasHardEvidence = signals.some((s) => s.severity === "high");
  if (hasHardEvidence) score = Math.max(score, 55);

  score = Math.round(Math.min(Math.max(score, 0), 100));
  return { score, verdict: verdictForScore(score) };
}

export function buildReport(options: {
  ai: AiAnalysis | null;
  aiNotice: string | null;
  headerAnalysis: HeaderAnalysis | null;
  linkAnalysis: LinkAnalysis;
  extraSignals: ForensicSignal[];
}): RiskReport {
  const { ai, aiNotice, headerAnalysis, linkAnalysis, extraSignals } = options;
  const signals = [
    ...(headerAnalysis?.signals ?? []),
    ...linkAnalysis.signals,
    ...extraSignals,
  ];
  const { score, verdict } = blendScore(ai, signals);

  return {
    verdict,
    risk_score: score,
    ai,
    ai_notice: aiNotice,
    forensics: {
      signals,
      links: linkAnalysis.links,
      headers: headerAnalysis?.parsed ?? null,
    },
    scanned_at: new Date().toISOString(),
  };
}
