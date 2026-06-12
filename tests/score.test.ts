import { describe, expect, it } from "vitest";
import { blendScore } from "@/lib/score";
import type { AiAnalysis, ForensicSignal } from "@/lib/schema";

const baseAi: AiAnalysis = {
  risk_score: 0,
  scam_category: "legitimate",
  confidence: "high",
  summary: "",
  grandma_summary: "",
  red_flags: [],
  advice: [],
};

const highSignal: ForensicSignal = {
  id: "spf-fail",
  label: "SPF failed",
  detail: "",
  severity: "high",
  weight: 25,
};

describe("blendScore", () => {
  it("scores a clean message with no signals as safe", () => {
    const { score, verdict } = blendScore({ ...baseAi, risk_score: 5 }, []);
    expect(score).toBeLessThan(30);
    expect(verdict).toBe("safe");
  });

  it("scores an obvious AI-flagged scam as dangerous", () => {
    const { score, verdict } = blendScore({ ...baseAi, risk_score: 95 }, []);
    expect(score).toBeGreaterThanOrEqual(60);
    expect(verdict).toBe("dangerous");
  });

  it("applies a floor when hard evidence exists, even if AI was fooled", () => {
    const { score, verdict } = blendScore({ ...baseAi, risk_score: 5 }, [
      highSignal,
    ]);
    expect(score).toBeGreaterThanOrEqual(55);
    expect(verdict).not.toBe("safe");
  });

  it("works without AI (forensics-only mode)", () => {
    const { score, verdict } = blendScore(null, [
      highSignal,
      { ...highSignal, id: "typosquat:x", weight: 30 },
    ]);
    expect(score).toBeGreaterThanOrEqual(60);
    expect(verdict).toBe("dangerous");
  });

  it("scores no-AI no-signal scans as safe", () => {
    const { score, verdict } = blendScore(null, []);
    expect(score).toBe(0);
    expect(verdict).toBe("safe");
  });

  it("clamps to 0-100", () => {
    const { score } = blendScore({ ...baseAi, risk_score: 100 }, [
      { ...highSignal, weight: 500 },
    ]);
    expect(score).toBeLessThanOrEqual(100);
  });
});
