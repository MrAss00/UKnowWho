import { parse as parseDomain } from "tldts";
import type { ForensicSignal, Severity } from "@/lib/schema";
import {
  PROTECTED_BRANDS,
  SUSPICIOUS_TLDS,
  URL_SHORTENERS,
} from "@/lib/forensics/brands";

export interface LinkFinding {
  url: string;
  domain: string;
  flags: string[];
  severity: Severity;
}

export interface LinkAnalysis {
  links: LinkFinding[];
  signals: ForensicSignal[];
}

const URL_REGEX = /\bhttps?:\/\/[^\s<>"')\]]+|\bwww\.[^\s<>"')\]]+/gi;

/** Homoglyphs commonly substituted into lookalike domains. */
const HOMOGLYPHS: Record<string, string> = {
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  rn: "m",
  vv: "w",
};

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i, ...new Array<number>(n)];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[n];
}

function normalizeHomoglyphs(label: string): string {
  let out = label;
  for (const [glyph, replacement] of Object.entries(HOMOGLYPHS)) {
    out = out.split(glyph).join(replacement);
  }
  return out;
}

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  const cleaned = matches.map((m) =>
    (m.startsWith("www.") ? `http://${m}` : m).replace(/[.,;:!?]+$/, ""),
  );
  return [...new Set(cleaned)];
}

/** Distance tolerance scaled to brand length; exact-only for tiny brands. */
function maxDistanceFor(brandLabel: string): number {
  if (brandLabel.length <= 3) return 0;
  if (brandLabel.length <= 5) return 1;
  return 2;
}

function matchesBrand(candidate: string, brandLabel: string): boolean {
  if (candidate === brandLabel) return true;
  const normalized = normalizeHomoglyphs(candidate);
  if (normalized === brandLabel) return true;
  return levenshtein(normalized, brandLabel) <= maxDistanceFor(brandLabel);
}

/**
 * Check a domain label against the protected-brand list. The whole label and
 * each hyphen-separated segment are compared after homoglyph normalization,
 * so "paypa1-secure-verify.top" matches even though the whole label is far
 * from "paypal". Returns the impersonated brand, or null.
 */
export function findTyposquat(
  hostname: string,
): { brand: string; legitimate: string } | null {
  const parsed = parseDomain(hostname);
  const registrable = parsed.domain;
  const label = parsed.domainWithoutSuffix?.toLowerCase();
  if (!registrable || !label) return null;

  for (const brand of PROTECTED_BRANDS) {
    if (brand.legitimate.includes(registrable.toLowerCase())) return null;
  }

  const segments = label.split("-").filter(Boolean);
  for (const brand of PROTECTED_BRANDS) {
    const wholeLabelImitation =
      label !== brand.label && matchesBrand(label, brand.label);
    const segmentImitation = segments.some((segment) =>
      matchesBrand(segment, brand.label),
    );
    if (wholeLabelImitation || segmentImitation) {
      return { brand: brand.label, legitimate: brand.legitimate[0] };
    }
  }
  return null;
}

export function analyzeLinks(text: string): LinkAnalysis {
  const urls = extractUrls(text);
  const links: LinkFinding[] = [];
  const signals: ForensicSignal[] = [];
  const seenSignalIds = new Set<string>();

  const pushSignal = (signal: ForensicSignal) => {
    if (seenSignalIds.has(signal.id)) return;
    seenSignalIds.add(signal.id);
    signals.push(signal);
  };

  for (const url of urls) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    const hostname = parsed.hostname.toLowerCase();
    const flags: string[] = [];
    let severity: Severity = "low";
    const bump = (s: Severity) => {
      const order = { low: 0, medium: 1, high: 2 } as const;
      if (order[s] > order[severity]) severity = s;
    };

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
      flags.push("Links to a raw IP address instead of a domain");
      bump("high");
      pushSignal({
        id: `ip-literal:${hostname}`,
        label: "Link points to a raw IP address",
        detail: `${url} bypasses DNS entirely — legitimate services almost never link to bare IPs.`,
        severity: "high",
        weight: 20,
      });
    }

    if (parsed.username) {
      flags.push("Uses the user@host URL trick to disguise the real site");
      bump("high");
      pushSignal({
        id: `userinfo:${hostname}`,
        label: "Deceptive user@host URL",
        detail: `${url} places a fake domain before "@" — the browser actually visits ${hostname}.`,
        severity: "high",
        weight: 20,
      });
    }

    if (hostname.startsWith("xn--") || hostname.includes(".xn--")) {
      flags.push("Punycode/internationalized domain — can imitate brand letters");
      bump("medium");
      pushSignal({
        id: `punycode:${hostname}`,
        label: "Punycode domain",
        detail: `${hostname} uses internationalized characters that can render identically to a trusted brand's name.`,
        severity: "medium",
        weight: 12,
      });
    }

    if (URL_SHORTENERS.has(hostname)) {
      flags.push("Shortened URL hides the destination");
      bump("medium");
      pushSignal({
        id: `shortener:${hostname}`,
        label: "Shortened link",
        detail: `${url} hides its true destination behind ${hostname}. Scammers use shorteners to evade inspection.`,
        severity: "medium",
        weight: 8,
      });
    }

    const tld = parseDomain(hostname).publicSuffix;
    if (tld && SUSPICIOUS_TLDS.has(tld)) {
      flags.push(`.${tld} domains are heavily abused for scams`);
      bump("medium");
      pushSignal({
        id: `tld:${tld}`,
        label: `Abuse-prone .${tld} domain`,
        detail: `The .${tld} extension is disproportionately used in phishing because registrations are free or near-free.`,
        severity: "medium",
        weight: 8,
      });
    }

    const squat = findTyposquat(hostname);
    if (squat) {
      flags.push(
        `Looks like "${squat.brand}" but is NOT ${squat.legitimate}`,
      );
      bump("high");
      pushSignal({
        id: `typosquat:${hostname}`,
        label: `Lookalike of ${squat.brand}`,
        detail: `${hostname} imitates ${squat.brand} (real site: ${squat.legitimate}). Lookalike domains are the backbone of credential phishing.`,
        severity: "high",
        weight: 30,
      });
    }

    const subdomainCount = hostname.split(".").length - 2;
    if (subdomainCount >= 3) {
      flags.push("Unusually deep subdomain chain");
      bump("medium");
    }

    links.push({ url, domain: hostname, flags, severity });
  }

  return { links, signals };
}
