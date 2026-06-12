import { AiAnalysisSchema, type AiAnalysis } from "@/lib/schema";

export const SYSTEM_PROMPT = `You are UKnowWho, an expert fraud analyst. You analyze messages, emails, chat screenshots, and profiles that ordinary people received and suspect might be scams or impersonation attempts.

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

export function userPrompt(content: string): string {
  return `Analyze the following content the user received:\n\n<content>\n${content}\n</content>`;
}

/**
 * Pull a JSON object out of a model's text response, tolerating code fences
 * and surrounding prose, then validate it against the analysis schema.
 * Used by providers (like DeepSeek) that return JSON as free-form text
 * rather than guaranteed structured output.
 */
export function parseAnalysisJson(raw: string): AiAnalysis {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new AiUnavailableError("The AI returned a non-JSON response.");
  }

  let data: unknown;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AiUnavailableError("The AI returned malformed JSON.");
  }

  const result = AiAnalysisSchema.safeParse(data);
  if (!result.success) {
    throw new AiUnavailableError(
      "The AI response did not match the expected format.",
    );
  }
  return result.data;
}
