import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AiAnalysisSchema, type AiAnalysis } from "@/lib/schema";
import {
  AiUnavailableError,
  SYSTEM_PROMPT,
  userPrompt,
  type AnalyzeInput,
} from "@/lib/ai/shared";

const MODEL = process.env.UKNOWWHO_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export async function analyzeWithAnthropic(
  input: AnalyzeInput,
): Promise<AiAnalysis> {
  const client = new Anthropic();

  const userContent: Anthropic.ContentBlockParam[] = [];
  if (input.imageBase64 && input.imageMediaType) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.imageMediaType,
        data: input.imageBase64,
      },
    });
  }
  userContent.push({ type: "text", text: userPrompt(input.content) });

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      thinking: { type: "disabled" },
      output_config: {
        effort: "low",
        format: zodOutputFormat(AiAnalysisSchema),
      },
      messages: [{ role: "user", content: userContent }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new AiUnavailableError(
        "The AI model declined to analyze this content.",
      );
    }
    return response.parsed_output;
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AiUnavailableError(
        "Invalid ANTHROPIC_API_KEY — AI analysis skipped.",
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AiUnavailableError(
        "Anthropic rate limit reached — try again in a moment.",
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new AiUnavailableError(
        `Anthropic service error (${error.status}) — deterministic forensics only.`,
      );
    }
    throw error;
  }
}
