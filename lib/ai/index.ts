import type { AiAnalysis } from "@/lib/schema";
import { AiUnavailableError, type AnalyzeInput } from "@/lib/ai/shared";
import { analyzeWithAnthropic } from "@/lib/ai/anthropic";
import { analyzeWithDeepSeek } from "@/lib/ai/deepseek";

export { AiUnavailableError } from "@/lib/ai/shared";
export type { AnalyzeInput } from "@/lib/ai/shared";

export type Provider = "anthropic" | "deepseek";

/**
 * Pick the AI provider. Explicit override via UKNOWWHO_PROVIDER wins; otherwise
 * we use whichever key is present (Anthropic preferred for its vision support).
 */
export function selectProvider(): Provider | null {
  const override = process.env.UKNOWWHO_PROVIDER?.toLowerCase();
  if (override === "anthropic") {
    return process.env.ANTHROPIC_API_KEY ? "anthropic" : null;
  }
  if (override === "deepseek") {
    return process.env.DEEPSEEK_API_KEY ? "deepseek" : null;
  }
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  return null;
}

export async function analyze(input: AnalyzeInput): Promise<AiAnalysis> {
  const provider = selectProvider();
  if (!provider) {
    throw new AiUnavailableError(
      "No AI key set (ANTHROPIC_API_KEY or DEEPSEEK_API_KEY) — deterministic forensics only.",
    );
  }
  return provider === "deepseek"
    ? analyzeWithDeepSeek(input)
    : analyzeWithAnthropic(input);
}
