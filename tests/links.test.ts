import { describe, expect, it } from "vitest";
import {
  analyzeLinks,
  extractUrls,
  findTyposquat,
  levenshtein,
} from "@/lib/forensics/links";

describe("levenshtein", () => {
  it("is 0 for identical strings", () => {
    expect(levenshtein("paypal", "paypal")).toBe(0);
  });
  it("counts substitutions", () => {
    expect(levenshtein("paypa1", "paypal")).toBe(1);
  });
  it("counts insertions and deletions", () => {
    expect(levenshtein("payppal", "paypal")).toBe(1);
    expect(levenshtein("papal", "paypal")).toBe(1);
  });
});

describe("extractUrls", () => {
  it("finds http(s) and www URLs and strips trailing punctuation", () => {
    const urls = extractUrls(
      "Visit https://example.com/a, or www.test.com. Done http://x.io/path!",
    );
    expect(urls).toContain("https://example.com/a");
    expect(urls).toContain("http://www.test.com");
    expect(urls).toContain("http://x.io/path");
  });
  it("dedupes", () => {
    expect(extractUrls("https://a.com https://a.com")).toHaveLength(1);
  });
});

describe("findTyposquat", () => {
  it("flags digit-substitution lookalikes", () => {
    expect(findTyposquat("paypa1.com")?.brand).toBe("paypal");
    expect(findTyposquat("g00gle.com")?.brand).toBe("google");
  });
  it("flags brand-with-suffix domains", () => {
    expect(findTyposquat("paypal-secure-verify.top")?.brand).toBe("paypal");
    expect(findTyposquat("netflix-billing.live")?.brand).toBe("netflix");
  });
  it("flags close misspellings", () => {
    expect(findTyposquat("amazom.com")?.brand).toBe("amazon");
    expect(findTyposquat("micros0ft.com")?.brand).toBe("microsoft");
  });
  it("does NOT flag the real domains", () => {
    expect(findTyposquat("paypal.com")).toBeNull();
    expect(findTyposquat("www.google.com")).toBeNull();
    expect(findTyposquat("amazon.co.uk")).toBeNull();
  });
  it("does NOT flag unrelated domains", () => {
    expect(findTyposquat("booknook.com")).toBeNull();
    expect(findTyposquat("example.org")).toBeNull();
  });
});

describe("analyzeLinks", () => {
  it("flags lookalike domains as high severity", () => {
    const { links, signals } = analyzeLinks(
      "Verify: http://paypa1-secure-verify.top/restore",
    );
    expect(links).toHaveLength(1);
    expect(links[0].severity).toBe("high");
    expect(signals.some((s) => s.id.startsWith("typosquat:"))).toBe(true);
    expect(signals.some((s) => s.id === "tld:top")).toBe(true);
  });

  it("flags shorteners as medium severity", () => {
    const { links, signals } = analyzeLinks("Pay here https://bit.ly/3xk9pZq");
    expect(links[0].severity).toBe("medium");
    expect(signals.some((s) => s.id === "shortener:bit.ly")).toBe(true);
  });

  it("flags raw IP links", () => {
    const { signals } = analyzeLinks("Login at http://203.0.113.7/secure");
    expect(signals.some((s) => s.id.startsWith("ip-literal:"))).toBe(true);
  });

  it("flags the user@host trick", () => {
    const { signals } = analyzeLinks(
      "https://paypal.com@evil-site.io/login",
    );
    expect(signals.some((s) => s.id.startsWith("userinfo:"))).toBe(true);
  });

  it("leaves clean links unflagged", () => {
    const { links, signals } = analyzeLinks(
      "Track at https://www.amazon.com/orders",
    );
    expect(links[0].flags).toHaveLength(0);
    expect(signals).toHaveLength(0);
  });

  it("handles text with no links", () => {
    const { links, signals } = analyzeLinks("Hello, see you tomorrow!");
    expect(links).toHaveLength(0);
    expect(signals).toHaveLength(0);
  });
});
