import { parse as parseDomain } from "tldts";
import type { ForensicSignal } from "@/lib/schema";

const RDAP_TIMEOUT_MS = 4000;
const YOUNG_DOMAIN_DAYS = 90;

/**
 * Look up a domain's registration date via the public RDAP bootstrap service.
 * Best-effort: returns null on any failure (offline, rate limit, unsupported TLD)
 * so a network hiccup never blocks a scan.
 */
export async function domainAgeDays(hostname: string): Promise<number | null> {
  const registrable = parseDomain(hostname).domain;
  if (!registrable) return null;
  try {
    const response = await fetch(
      `https://rdap.org/domain/${encodeURIComponent(registrable)}`,
      { signal: AbortSignal.timeout(RDAP_TIMEOUT_MS), redirect: "follow" },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      events?: Array<{ eventAction?: string; eventDate?: string }>;
    };
    const registration = data.events?.find(
      (e) => e.eventAction === "registration",
    )?.eventDate;
    if (!registration) return null;
    const ageMs = Date.now() - new Date(registration).getTime();
    if (Number.isNaN(ageMs) || ageMs < 0) return null;
    return Math.floor(ageMs / 86_400_000);
  } catch {
    return null;
  }
}

/** Check the first few unique domains for recent registration. */
export async function youngDomainSignals(
  hostnames: string[],
): Promise<ForensicSignal[]> {
  const registrables = [
    ...new Set(
      hostnames
        .map((h) => parseDomain(h).domain)
        .filter((d): d is string => Boolean(d)),
    ),
  ].slice(0, 5);

  const results = await Promise.all(
    registrables.map(async (domain) => ({
      domain,
      age: await domainAgeDays(domain),
    })),
  );

  return results
    .filter(
      (r): r is { domain: string; age: number } =>
        r.age !== null && r.age < YOUNG_DOMAIN_DAYS,
    )
    .map(({ domain, age }) => ({
      id: `young-domain:${domain}`,
      label: `Freshly registered domain (${age} day${age === 1 ? "" : "s"} old)`,
      detail: `${domain} was registered ${age} day${age === 1 ? "" : "s"} ago. Scam infrastructure is typically days or weeks old; established services are years old.`,
      severity: "high" as const,
      weight: 18,
    }));
}
