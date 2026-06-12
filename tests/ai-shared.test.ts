import { describe, expect, it } from "vitest";
import { parseAnalysisJson, AiUnavailableError } from "@/lib/ai/shared";

const VALID = {
  risk_score: 88,
  scam_category: "phishing",
  confidence: "high",
  summary: "Credential-harvesting email impersonating a bank.",
  grandma_summary: "This is a trick. Your bank never asks this. Delete it.",
  red_flags: [
    { quote: "verify within 24 HOURS", explanation: "Fake urgency.", severity: "high" },
  ],
  advice: ["Don't click the link.", "Contact your bank directly."],
};

describe("parseAnalysisJson", () => {
  it("parses a clean JSON string", () => {
    const result = parseAnalysisJson(JSON.stringify(VALID));
    expect(result.risk_score).toBe(88);
    expect(result.scam_category).toBe("phishing");
    expect(result.red_flags).toHaveLength(1);
  });

  it("strips ```json code fences", () => {
    const result = parseAnalysisJson(
      "```json\n" + JSON.stringify(VALID) + "\n```",
    );
    expect(result.confidence).toBe("high");
  });

  it("ignores prose around the JSON object", () => {
    const result = parseAnalysisJson(
      `Here is my analysis:\n${JSON.stringify(VALID)}\nLet me know if you need more.`,
    );
    expect(result.scam_category).toBe("phishing");
  });

  it("throws AiUnavailableError on non-JSON text", () => {
    expect(() => parseAnalysisJson("I cannot help with that.")).toThrow(
      AiUnavailableError,
    );
  });

  it("throws AiUnavailableError on malformed JSON", () => {
    expect(() => parseAnalysisJson('{"risk_score": 88,')).toThrow(
      AiUnavailableError,
    );
  });

  it("throws AiUnavailableError when the shape is wrong", () => {
    expect(() =>
      parseAnalysisJson(JSON.stringify({ risk_score: "very high" })),
    ).toThrow(AiUnavailableError);
  });
});
