/**
 * Frequently-impersonated brands, compared against scanned domains for
 * typosquat detection. Names are the registrable-domain label (no TLD).
 */
export const PROTECTED_BRANDS: ReadonlyArray<{
  label: string;
  legitimate: ReadonlyArray<string>;
}> = [
  { label: "paypal", legitimate: ["paypal.com", "paypal.me"] },
  { label: "google", legitimate: ["google.com", "goo.gl", "google.co.uk"] },
  { label: "apple", legitimate: ["apple.com", "icloud.com"] },
  { label: "microsoft", legitimate: ["microsoft.com", "live.com", "outlook.com"] },
  { label: "amazon", legitimate: ["amazon.com", "amazon.in", "amazon.co.uk", "amzn.to"] },
  { label: "netflix", legitimate: ["netflix.com"] },
  { label: "facebook", legitimate: ["facebook.com", "fb.com"] },
  { label: "instagram", legitimate: ["instagram.com"] },
  { label: "whatsapp", legitimate: ["whatsapp.com", "wa.me"] },
  { label: "linkedin", legitimate: ["linkedin.com", "lnkd.in"] },
  { label: "twitter", legitimate: ["twitter.com", "x.com", "t.co"] },
  { label: "binance", legitimate: ["binance.com"] },
  { label: "coinbase", legitimate: ["coinbase.com"] },
  { label: "chase", legitimate: ["chase.com"] },
  { label: "wellsfargo", legitimate: ["wellsfargo.com"] },
  { label: "bankofamerica", legitimate: ["bankofamerica.com", "bofa.com"] },
  { label: "hsbc", legitimate: ["hsbc.com", "hsbc.co.uk", "hsbc.co.in"] },
  { label: "dhl", legitimate: ["dhl.com", "dhl.de"] },
  { label: "fedex", legitimate: ["fedex.com"] },
  { label: "ups", legitimate: ["ups.com"] },
  { label: "usps", legitimate: ["usps.com"] },
  { label: "irs", legitimate: ["irs.gov"] },
  { label: "dropbox", legitimate: ["dropbox.com"] },
  { label: "docusign", legitimate: ["docusign.com", "docusign.net"] },
  { label: "adobe", legitimate: ["adobe.com"] },
  { label: "spotify", legitimate: ["spotify.com"] },
  { label: "steam", legitimate: ["steampowered.com", "steamcommunity.com"] },
  { label: "telegram", legitimate: ["telegram.org", "t.me"] },
  { label: "anthropic", legitimate: ["anthropic.com", "claude.ai", "claude.com"] },
  { label: "openai", legitimate: ["openai.com", "chatgpt.com"] },
];

/** Common URL shorteners — hide the real destination. */
export const URL_SHORTENERS: ReadonlySet<string> = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "is.gd",
  "buff.ly",
  "ow.ly",
  "rb.gy",
  "cutt.ly",
  "shorturl.at",
  "rebrand.ly",
  "t.ly",
  "lnkd.in",
  "s.id",
]);

/** TLDs with heavily abused free/cheap registrations. */
export const SUSPICIOUS_TLDS: ReadonlySet<string> = new Set([
  "tk",
  "ml",
  "ga",
  "cf",
  "gq",
  "top",
  "xyz",
  "click",
  "link",
  "live",
  "icu",
  "rest",
  "zip",
  "mov",
]);
