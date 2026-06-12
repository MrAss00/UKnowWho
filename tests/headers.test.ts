import { describe, expect, it } from "vitest";
import {
  analyzeHeaders,
  domainOfAddress,
  extractEmailAddress,
} from "@/lib/forensics/headers";

const SPOOFED_HEADERS = `From: "Margaret Chen, CEO" <m.chen@acme-corp.com>
Reply-To: <margaret.chen.ceo@secure-mail-office.live>
Return-Path: <bounce@mailblast-7.xyz>
Authentication-Results: mx.acme-corp.com;
 spf=fail smtp.mailfrom=mailblast-7.xyz;
 dkim=none; dmarc=fail header.from=acme-corp.com
Subject: Quick task`;

const CLEAN_HEADERS = `From: BookNook <orders@booknook.com>
Return-Path: <orders@booknook.com>
Authentication-Results: mx.google.com; spf=pass smtp.mailfrom=booknook.com; dkim=pass header.d=booknook.com; dmarc=pass header.from=booknook.com
Subject: Your order has shipped`;

describe("extractEmailAddress", () => {
  it("extracts angle-bracketed addresses", () => {
    expect(extractEmailAddress('"Jane" <jane@example.com>')).toBe(
      "jane@example.com",
    );
  });
  it("extracts bare addresses", () => {
    expect(extractEmailAddress("jane@example.com")).toBe("jane@example.com");
  });
  it("lowercases", () => {
    expect(extractEmailAddress("<Jane@Example.COM>")).toBe("jane@example.com");
  });
});

describe("domainOfAddress", () => {
  it("returns the domain part", () => {
    expect(domainOfAddress("a@b.com")).toBe("b.com");
  });
  it("handles null", () => {
    expect(domainOfAddress(null)).toBeNull();
  });
});

describe("analyzeHeaders", () => {
  it("flags spoofed CEO-fraud headers", () => {
    const { parsed, signals } = analyzeHeaders(SPOOFED_HEADERS);
    expect(parsed.from).toBe("m.chen@acme-corp.com");
    expect(parsed.replyTo).toBe("margaret.chen.ceo@secure-mail-office.live");
    expect(parsed.spf).toBe("fail");
    expect(parsed.dmarc).toBe("fail");

    const ids = signals.map((s) => s.id);
    expect(ids).toContain("reply-to-mismatch");
    expect(ids).toContain("return-path-mismatch");
    expect(ids).toContain("spf-fail");
    expect(ids).toContain("dmarc-fail");
    expect(signals.some((s) => s.severity === "high")).toBe(true);
  });

  it("unfolds multi-line Authentication-Results headers", () => {
    const { parsed } = analyzeHeaders(SPOOFED_HEADERS);
    expect(parsed.dkim).toBe("none");
  });

  it("produces no signals for clean, aligned headers", () => {
    const { parsed, signals } = analyzeHeaders(CLEAN_HEADERS);
    expect(parsed.spf).toBe("pass");
    expect(parsed.dkim).toBe("pass");
    expect(parsed.dmarc).toBe("pass");
    expect(signals).toHaveLength(0);
  });

  it("reads Received-SPF when Authentication-Results is absent", () => {
    const { parsed } = analyzeHeaders(
      `From: <a@b.com>\nReceived-SPF: softfail (transitioning)`,
    );
    expect(parsed.spf).toBe("softfail");
  });
});
