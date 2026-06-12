import { ScamCategorySchema, type AiAnalysis } from "@/lib/schema";
import {
  AiUnavailableError,
  SYSTEM_PROMPT,
  parseAnalysisJson,
  userPrompt,
  type AnalyzeInput,
} from "@/lib/ai/shared";

const MODEL = process.env.UKNOWWHO_DEEPSEEK_MODEL ?? "deepseek-chat";
const BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const TIMEOUT_MS = 30_000;

const CATEGORIES = ScamCategorySchema.options.join(" | ");

// DeepSeek has no guaranteed-schema mode, so we describe the exact JSON shape
// in the prompt and validate the result with Zod afterwards.
const JSON_INSTRUCTIONS = `Respond with ONLY a single JSON object (no markdown, no commentary) matching exactly this shape:
{
  "risk_score": <integer 0-100>,
  "scam_category": <one of: ${CATEGORIES}>,
  "confidence": <"low" | "medium" | "high">,
  "summary": "<2-3 sentence technical assessment>",
  "grandma_summary": "<1-3 simple sentences a non-technical person understands>",
  "red_flags": [
    { "quote": "<exact phrase copied from the content>", "explanation": "<why it is suspicious>", "severity": <"low" | "medium" | "high"> }
  ],
  "advice": ["<concrete next step>", "..."]
}
Use an empty array for red_flags if there are none.`;

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * DeepSeek exposes an OpenAI-compatible Chat Completions endpoint. We call it
 * with a direct fetch rather than the OpenAI SDK to avoid pulling that
 * package (and its optional `ws` peer dependency) into the bundle.
 */
export async function analyzeWithDeepSeek(
  input: AnalyzeInput,
): Promise<AiAnalysis> {
  if (input.imageBase64 && !input.content.trim()) {
    throw new AiUnavailableError(
      "DeepSeek (deepseek-chat) can't read screenshots — paste the text, or use an Anthropic key for image scanning.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\n${JSON_INSTRUCTIONS}`,
          },
          { role: "user", content: userPrompt(input.content) },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AiUnavailableError(
      "Couldn't reach DeepSeek — deterministic forensics only.",
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new AiUnavailableError(
        "Invalid DEEPSEEK_API_KEY — AI analysis skipped.",
      );
    }
    if (response.status === 402) {
      throw new AiUnavailableError(
        "DeepSeek account has insufficient balance — AI analysis skipped.",
      );
    }
    if (response.status === 429) {
      throw new AiUnavailableError(
        "DeepSeek rate limit reached — try again in a moment.",
      );
    }
    throw new AiUnavailableError(
      `DeepSeek service error (${response.status}) — deterministic forensics only.`,
    );
  }

  const data = (await response.json()) as ChatCompletion;
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new AiUnavailableError("DeepSeek returned an empty response.");
  }
  return parseAnalysisJson(text);
}
