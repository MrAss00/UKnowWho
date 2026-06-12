import type { ForensicSignal } from "@/lib/schema";

export interface ParsedHeaders {
  from: string | null;
  replyTo: string | null;
  returnPath: string | null;
  spf: string | null;
  dkim: string | null;
  dmarc: string | null;
}

export interface HeaderAnalysis {
  parsed: ParsedHeaders;
  signals: ForensicSignal[];
}

/** Unfold RFC 5322 continuation lines and return a name -> values map. */
function parseRawHeaders(raw: string): Map<string, string[]> {
  const unfolded = raw.replace(/\r?\n[ \t]+/g, " ");
  const map = new Map<string, string[]>();
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const name = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!/^[\x21-\x39\x3b-\x7e]+$/.test(name)) continue;
    const existing = map.get(name) ?? [];
    existing.push(value);
    map.set(name, existing);
  }
  return map;
}

export function extractEmailAddress(headerValue: string): string | null {
  const angled = headerValue.match(/<([^<>\s]+@[^<>\s]+)>/);
  if (angled) return angled[1].toLowerCase();
  const bare = headerValue.match(/([^\s<>"',;]+@[^\s<>"',;]+)/);
  return bare ? bare[1].toLowerCase() : null;
}

export function domainOfAddress(address: string | null): string | null {
  if (!address) return null;
  const at = address.lastIndexOf("@");
  return at === -1 ? null : address.slice(at + 1).toLowerCase();
}

function authResult(
  authHeaders: string[],
  mechanism: "spf" | "dkim" | "dmarc",
): string | null {
  for (const header of authHeaders) {
    const m = header.match(new RegExp(`${mechanism}\\s*=\\s*(\\w+)`, "i"));
    if (m) return m[1].toLowerCase();
  }
  return null;
}

export function analyzeHeaders(raw: string): HeaderAnalysis {
  const headers = parseRawHeaders(raw);
  const signals: ForensicSignal[] = [];

  const fromRaw = headers.get("from")?.[0] ?? null;
  const replyToRaw = headers.get("reply-to")?.[0] ?? null;
  const returnPathRaw = headers.get("return-path")?.[0] ?? null;
  const authHeaders = headers.get("authentication-results") ?? [];
  // Some providers expose SPF only via Received-SPF.
  const receivedSpf = headers.get("received-spf")?.[0] ?? null;

  const from = fromRaw ? extractEmailAddress(fromRaw) : null;
  const replyTo = replyToRaw ? extractEmailAddress(replyToRaw) : null;
  const returnPath = returnPathRaw ? extractEmailAddress(returnPathRaw) : null;

  const spf =
    authResult(authHeaders, "spf") ??
    (receivedSpf ? (receivedSpf.match(/^\s*(\w+)/)?.[1].toLowerCase() ?? null) : null);
  const dkim = authResult(authHeaders, "dkim");
  const dmarc = authResult(authHeaders, "dmarc");

  const fromDomain = domainOfAddress(from);
  const replyToDomain = domainOfAddress(replyTo);
  const returnPathDomain = domainOfAddress(returnPath);

  if (fromDomain && replyToDomain && fromDomain !== replyToDomain) {
    signals.push({
      id: "reply-to-mismatch",
      label: "Reply-To goes somewhere else",
      detail: `The message claims to be from ${fromDomain}, but replies are silently routed to ${replyToDomain}. Classic redirection used in payment fraud and CEO impersonation.`,
      severity: "high",
      weight: 25,
    });
  }

  if (fromDomain && returnPathDomain && fromDomain !== returnPathDomain) {
    signals.push({
      id: "return-path-mismatch",
      label: "Sender envelope doesn't match the From address",
      detail: `Displayed sender domain is ${fromDomain} but the actual sending envelope (Return-Path) is ${returnPathDomain}. Strong indication of a spoofed sender.`,
      severity: "medium",
      weight: 15,
    });
  }

  for (const [mechanism, result] of [
    ["SPF", spf],
    ["DKIM", dkim],
    ["DMARC", dmarc],
  ] as const) {
    if (result && ["fail", "permerror", "softfail"].includes(result)) {
      const hard = result === "fail" || result === "permerror";
      signals.push({
        id: `${mechanism.toLowerCase()}-${result}`,
        label: `${mechanism} check ${result === "softfail" ? "soft-failed" : "failed"}`,
        detail: `${mechanism} verification returned "${result}". The sending server is not authorized to send mail for this domain — a hallmark of sender spoofing.`,
        severity: hard ? "high" : "medium",
        weight: hard ? 25 : 12,
      });
    }
  }

  return {
    parsed: { from, replyTo, returnPath, spf, dkim, dmarc },
    signals,
  };
}
