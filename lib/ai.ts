import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AiAnalysisSchema, type AiAnalysis } from "@/lib/schema";

const MODEL = process.env.UKNOWWHO_MODEL ?? "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are UKnowWho, an expert fraud analyst. You analyze messages, emails, chat screenshots, and profiles that ordinary people received and suspect might be scams or impersonation attempts.

Your job:
1. Decide how likely the content is a scam/impersonation attempt (risk_score 0-100).
2. Classify the scam type.
3. Extract every red flag as an EXACT quote from the content with a plain-language explanation. Quote only text that actually appears in the content.
4. Give practical advice for the recipient.

Risk score calibration:
- 0-15: clearly legitimate (routine personal/business correspondence with no manipulation patterns)
- 16-29: probably fine, minor oddities
- 30-59: suspicious — several manipulation patterns or inconsistencies
- 60-84: very likely a scam
- 85-100: textbook scam (credential harvesting, payment redirection, known scam formats)

Patterns to weigh heavily: urgency and deadlines, threats or fear, requests for payment via gift cards/crypto/wire, requests for credentials or codes, too-good-to-be-true offers, authority impersonation (bank, government, CEO, family member in trouble), secrecy requests, unsolicited attachments/links, mismatched or lookalike addresses and domains, moving the conversation to another platform, romance + money requests, job offers requiring upfront payment.

Be calibrated, not paranoid: ordinary marketing emails, real receipts, and genuine personal messages should score low. A legitimate message with a deadline is not automatically a scam.

The grandma_summary must be 1-3 short sentences a non-technical grandparent instantly understands, e.g. "This is a trick. Your bank never asks for your password by text. Delete it and don't reply."

If the user provides a screenshot, read all visible text in it and analyze that as the content.`;

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export interface AnalyzeInput {
  content: string;
  imageBase64?: string;
  imageMediaType?: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
}

export async function analyzeWithClaude(
  input: AnalyzeInput,
): Promise<AiAnalysis> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiUnavailableError(
      "ANTHROPIC_API_KEY is not set — AI analysis skipped. Deterministic forensics only.",
    );
  }

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
  userContent.push({
    type: "text",
    text: `Analyze the following content the user received:\n\n<content>\n${input.content}\n</content>`,
  });

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
        "AI rate limit reached — try again in a moment.",
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new AiUnavailableError(
        `AI service error (${error.status}) — deterministic forensics only.`,
      );
    }
    throw error;
  }
}
