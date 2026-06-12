# 🛡️ UKnowWho — know who you're really talking to

**AI-powered impersonation & scam detection.** Paste a suspicious email, text, DM, or screenshot and UKnowWho tells you in seconds whether you're talking to who you think you are — with the exact red flags highlighted and advice on what to do next.

Built for the **Vortexa Hackathon 2026** (AI × Cyber Security track).

## The problem

Impersonation fraud — phishing, smishing, CEO fraud, romance and job scams — costs victims tens of billions of dollars every year, and the latest wave is AI-written, typo-free, and convincing. The people most at risk (parents, grandparents, new employees) are exactly the people who can't tell a spoofed `Reply-To` from a real one.

## The solution

UKnowWho gives anyone a fraud analyst in their pocket. It combines **two independent engines**, so the verdict is never just "the AI said so":

1. **AI analysis (Claude)** — a fraud-analyst prompt with structured output classifies the scam type, scores the risk 0–100, extracts every red flag as an exact quote with a plain-language explanation, and produces advice. A "grandma mode" toggle re-explains the verdict in language anyone's grandparent would understand.
2. **Deterministic forensics (no AI involved)** — pure code that checks hard evidence:
   - **Email authentication** — SPF / DKIM / DMARC results, `From` vs `Reply-To` vs `Return-Path` mismatches (spoofing & CEO fraud)
   - **Lookalike domains** — homoglyph normalization (`paypa1` → `paypal`) plus per-segment Levenshtein matching against frequently-impersonated brands
   - **Link inspection** — URL shorteners, raw-IP links, the `user@host` trick, punycode, abuse-prone TLDs
   - **Domain age** — live RDAP lookups flag domains registered in the last 90 days

A score blender merges both: hard evidence sets a floor (a spoofed sender is never "safe", however friendly the prose), and signals only push the score up, so clean messages aren't penalized.

## Features

- 📩 **Message scanner** — paste any email/SMS/DM
- 📬 **Header forensics** — paste raw headers (Gmail: ⋮ → Show original)
- 🖼️ **Screenshot scan** — upload a chat screenshot; Claude vision reads the text
- 🧓 **Grandma mode** — the same verdict, explained simply
- 📤 **Threat card** — copy a shareable summary to warn others
- 🕘 **Scan history** — stored locally in your browser, never on a server
- 🧪 **Demo samples** — one-click examples (bank phishing, delivery smishing, CEO fraud, and a legitimate receipt)
- 🔌 **Graceful degradation** — without an API key the forensics engine still works standalone

## Running it

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Without a key the app still runs — scans return deterministic forensics only, with a notice that AI analysis was skipped.

```bash
npm test            # unit tests (forensics + AI parser) and Scanner UI tests
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

## API

`POST /api/scan`

```jsonc
{
  "content": "string (required) — the message to analyze",
  "rawHeaders": "string (optional) — raw RFC 5322 email headers",
  "imageBase64": "string (optional) — screenshot, base64 without data: prefix",
  "imageMediaType": "image/png | image/jpeg | image/webp | image/gif"
}
```

Returns a `RiskReport`: blended `risk_score` (0–100), `verdict` (`safe` / `caution` / `dangerous`), the AI analysis (category, confidence, red-flag quotes, advice, grandma summary), and the forensic evidence (signals, per-link findings, parsed auth headers).

## Architecture

```
Browser (Next.js 16 UI — tabs, risk gauge, report cards)
   │
   ▼
POST /api/scan (Route Handler)
   ├─ Zod input validation
   ├─ Deterministic layer:  header parser ─ link extractor ─ typosquat check ─ RDAP age
   ├─ AI layer:             Claude structured output (messages.parse + Zod schema)
   └─ Score blender         hard-evidence floor → unified RiskReport
```

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui · Anthropic SDK (`claude-sonnet-4-6`, configurable via `UKNOWWHO_MODEL`) · Zod · tldts · Vitest

## Why it scales

The scanner is already an API. The same `/api/scan` endpoint can power a browser extension, a WhatsApp/Telegram bot ("forward a message, get a verdict"), or an enterprise email-gateway hook — with zero re-architecture. The brand list, signal weights, and model are all configuration.

## Team

Built by MrAss00 for Vortexa 2026.

## License

MIT
