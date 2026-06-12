import OpenAI from "openai";
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

export async function analyzeWithDeepSeek(
  input: AnalyzeInput,
): Promise<AiAnalysis> {
  if (input.imageBase64 && !input.content.trim()) {
    throw new AiUnavailableError(
      "DeepSeek (deepseek-chat) can't read screenshots — paste the text, or use an Anthropic key for image scanning.",
    );
  }

  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: BASE_URL,
  });

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\n${JSON_INSTRUCTIONS}` },
        { role: "user", content: userPrompt(input.content) },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new AiUnavailableError("DeepSeek returned an empty response.");
    }
    return parseAnalysisJson(text);
  } catch (error) {
    if (error instanceof AiUnavailableError) throw error;
    if (error instanceof OpenAI.AuthenticationError) {
      throw new AiUnavailableError(
        "Invalid DEEPSEEK_API_KEY — AI analysis skipped.",
      );
    }
    if (error instanceof OpenAI.RateLimitError) {
      throw new AiUnavailableError(
        "DeepSeek rate limit or insufficient balance — try again later.",
      );
    }
    if (error instanceof OpenAI.APIError) {
      throw new AiUnavailableError(
        `DeepSeek service error (${error.status ?? "unknown"}) — deterministic forensics only.`,
      );
    }
    throw error;
  }
}
