"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Heart,
  Link2,
  Mail,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RiskGauge } from "@/components/risk-gauge";
import type { RiskReport, Severity, Verdict } from "@/lib/schema";
import { cn } from "@/lib/utils";

const VERDICT_META: Record<
  Verdict,
  { title: string; icon: typeof ShieldAlert; className: string }
> = {
  safe: {
    title: "Looks Safe",
    icon: ShieldCheck,
    className: "text-emerald-500",
  },
  caution: {
    title: "Be Careful",
    icon: ShieldQuestion,
    className: "text-amber-500",
  },
  dangerous: {
    title: "Likely a Scam",
    icon: ShieldAlert,
    className: "text-red-500",
  },
};

const SEVERITY_BADGE: Record<Severity, string> = {
  low: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  high: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function categoryLabel(category: string): string {
  return category
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export function ReportView({ report }: { report: RiskReport }) {
  const [grandmaMode, setGrandmaMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = VERDICT_META[report.verdict];
  const VerdictIcon = meta.icon;
  const ai = report.ai;

  const copyThreatCard = async () => {
    const lines = [
      `🛡️ UKnowWho scan result: ${meta.title.toUpperCase()} (risk ${report.risk_score}/100)`,
      ai ? `Type: ${categoryLabel(ai.scam_category)}` : null,
      ai ? `\n${grandmaMode ? ai.grandma_summary : ai.summary}` : null,
      ...(ai?.red_flags.slice(0, 3).map((f) => `⚠️ "${f.quote}" — ${f.explanation}`) ?? []),
      `\nScanned with UKnowWho — know who you're really talking to.`,
    ].filter(Boolean);
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-6 pt-6 sm:flex-row sm:gap-10">
          <RiskGauge score={report.risk_score} verdict={report.verdict} />
          <div className="flex flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
            <div className={cn("flex items-center gap-2", meta.className)}>
              <VerdictIcon className="h-7 w-7" />
              <h2 className="text-3xl font-bold tracking-tight">{meta.title}</h2>
            </div>
            {ai && (
              <Badge variant="secondary" className="text-xs">
                {categoryLabel(ai.scam_category)} · {ai.confidence} confidence
              </Badge>
            )}
            <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
              {ai
                ? grandmaMode
                  ? ai.grandma_summary
                  : ai.summary
                : "AI analysis was unavailable for this scan — the verdict below is based on technical forensics only."}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="grandma"
                  checked={grandmaMode}
                  onCheckedChange={setGrandmaMode}
                />
                <Label
                  htmlFor="grandma"
                  className="flex cursor-pointer items-center gap-1 text-xs"
                >
                  <Heart className="h-3.5 w-3.5 text-pink-500" />
                  Explain it simply
                </Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyThreatCard}
                className="h-7 gap-1.5 text-xs"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied!" : "Copy threat card"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {report.ai_notice && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            {report.ai_notice}
          </CardContent>
        </Card>
      )}

      {ai && ai.red_flags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Red flags found in the message ({ai.red_flags.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {ai.red_flags.map((flag, i) => (
              <div
                key={i}
                className="border-border bg-muted/40 rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <blockquote className="border-l-2 border-red-400 pl-3 text-sm italic">
                    &ldquo;{flag.quote}&rdquo;
                  </blockquote>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      SEVERITY_BADGE[flag.severity],
                    )}
                  >
                    {flag.severity}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-sm">
                  {flag.explanation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {report.forensics.signals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Technical forensics ({report.forensics.signals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {report.forensics.signals.map((signal) => (
              <div key={signal.id} className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    SEVERITY_BADGE[signal.severity],
                  )}
                >
                  {signal.severity}
                </span>
                <div>
                  <p className="text-sm font-medium">{signal.label}</p>
                  <p className="text-muted-foreground text-sm">
                    {signal.detail}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {report.forensics.headers && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-sky-500" />
              Email authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              {(
                [
                  ["From", report.forensics.headers.from],
                  ["Reply-To", report.forensics.headers.replyTo],
                  ["Return-Path", report.forensics.headers.returnPath],
                  ["SPF", report.forensics.headers.spf],
                  ["DKIM", report.forensics.headers.dkim],
                  ["DMARC", report.forensics.headers.dmarc],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground text-xs uppercase">
                    {label}
                  </dt>
                  <dd
                    className={cn(
                      "truncate font-mono text-xs",
                      ["fail", "permerror", "softfail"].includes(value ?? "")
                        ? "font-semibold text-red-500"
                        : value === "pass"
                          ? "text-emerald-500"
                          : "",
                    )}
                    title={value ?? "—"}
                  >
                    {value ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {report.forensics.links.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4 text-blue-500" />
              Links inspected ({report.forensics.links.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {report.forensics.links.map((link) => (
              <div key={link.url} className="text-sm">
                <div className="flex items-center gap-2">
                  {link.flags.length === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertTriangle
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        link.severity === "high"
                          ? "text-red-500"
                          : "text-amber-500",
                      )}
                    />
                  )}
                  <code className="truncate text-xs">{link.url}</code>
                </div>
                {link.flags.length > 0 && (
                  <ul className="text-muted-foreground mt-1 ml-5 list-disc pl-1 text-xs">
                    {link.flags.map((flag) => (
                      <li key={flag}>{flag}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {ai && ai.advice.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              What you should do
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2">
              {ai.advice.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="bg-primary text-primary-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Separator />
      <p className="text-muted-foreground text-center text-xs">
        Scanned {new Date(report.scanned_at).toLocaleString()} · UKnowWho gives
        guidance, not guarantees — when in doubt, contact the organization
        through its official website or phone number.
      </p>
    </div>
  );
}
