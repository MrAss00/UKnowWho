export interface Sample {
  id: string;
  label: string;
  description: string;
  content: string;
  rawHeaders?: string;
}

export const SAMPLES: Sample[] = [
  {
    id: "phishing-bank",
    label: "Bank phishing email",
    description: "Credential-harvesting email with a lookalike link",
    content: `Subject: URGENT: Your account has been temporarily suspended

Dear Valued Customer,

We detected unusual sign-in activity on your account. For your protection, your access has been TEMPORARILY SUSPENDED.

You must verify your identity within 24 HOURS or your account will be permanently closed and your funds frozen.

Verify now: http://paypa1-secure-verify.top/restore

Do not share this email with anyone, including bank staff, as the investigation is confidential.

Sincerely,
Account Security Team`,
  },
  {
    id: "smishing-delivery",
    label: "Delivery scam text",
    description: "SMS with a fake customs fee and shortened link",
    content: `[Delivery Notice] Your parcel UK-7731 is held at our facility due to an unpaid customs fee of $1.99. To avoid return to sender, settle the fee within 12 hours: https://bit.ly/3xk9pZq — Customer Care`,
  },
  {
    id: "ceo-fraud",
    label: "CEO impersonation",
    description: "Classic wire-transfer fraud with spoofed headers",
    content: `Hi, are you at your desk? I need you to process an urgent vendor payment before end of day. I'm heading into a board meeting and can't talk, so handle this by email only. The amount is $24,800 — I'll send the account details once you confirm. Keep this between us for now, it relates to a confidential acquisition.

Sent from my iPhone`,
    rawHeaders: `From: "Margaret Chen, CEO" <m.chen@acme-corp.com>
Reply-To: <margaret.chen.ceo@secure-mail-office.live>
Return-Path: <bounce@mailblast-7.xyz>
Authentication-Results: mx.acme-corp.com; spf=fail smtp.mailfrom=mailblast-7.xyz; dkim=none; dmarc=fail header.from=acme-corp.com
Date: Thu, 12 Jun 2026 09:14:22 +0000
Subject: Quick task - confidential`,
  },
  {
    id: "legit-receipt",
    label: "Legitimate receipt",
    description: "A normal order confirmation — should score low",
    content: `Subject: Your order has shipped!

Hi Sam,

Good news — order #118-2274 (USB-C cable, 2m) shipped today via standard delivery and should arrive Friday, June 19.

Track your package any time from the Orders section of your account.

Thanks for shopping with us!
The BookNook Team
123 Commerce St, Portland, OR`,
  },
];
