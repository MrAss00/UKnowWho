"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileSearch,
  History,
  ImageIcon,
  Loader2,
  Mail,
  MessageSquareText,
  ScanSearch,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ReportView } from "@/components/report-view";
import { SAMPLES } from "@/lib/samples";
import type { RiskReport, Verdict } from "@/lib/schema";
import { cn } from "@/lib/utils";

const HISTORY_KEY = "uknowwho.history.v1";
const MAX_HISTORY = 20;

interface HistoryEntry {
  id: string;
  preview: string;
  verdict: Verdict;
  score: number;
  scannedAt: string;
  report: RiskReport;
}

const VERDICT_DOT: Record<Verdict, string> = {
  safe: "bg-emerald-500",
  caution: "bg-amber-500",
  dangerous: "bg-red-500",
};

type ImageAttachment = {
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  name: string;
};

export function Scanner() {
  const [content, setContent] = useState("");
  const [rawHeaders, setRawHeaders] = useState("");
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only; loading persisted state after mount avoids SSR hydration mismatch
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // Corrupt history is not worth surfacing.
    }
  }, []);

  const saveHistory = useCallback((entries: HistoryEntry[]) => {
    setHistory(entries);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch {
      // Quota errors: history is a nicety, the scan still worked.
    }
  }, []);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setError("Please upload a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > 8_000_000) {
      setError("Image must be under 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImage({
        base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
        mediaType: file.type as ImageAttachment["mediaType"],
        name: file.name,
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const scan = async () => {
    const trimmed = content.trim();
    if (!trimmed && !image) {
      setError("Paste a message or add a screenshot first.");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed || "(screenshot only — read the text from the attached image)",
          rawHeaders: rawHeaders.trim() || undefined,
          imageBase64: image?.base64,
          imageMediaType: image?.mediaType,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? `Scan failed (${response.status})`);
      }
      const result = data as RiskReport;
      setReport(result);
      saveHistory(
        [
          {
            id: crypto.randomUUID(),
            preview: (trimmed || image?.name || "Screenshot").slice(0, 90),
            verdict: result.verdict,
            score: result.risk_score,
            scannedAt: result.scanned_at,
            report: result,
          },
          ...history,
        ].slice(0, MAX_HISTORY),
      );
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (sampleId: string) => {
    const sample = SAMPLES.find((s) => s.id === sampleId);
    if (!sample) return;
    setContent(sample.content);
    setRawHeaders(sample.rawHeaders ?? "");
    setImage(null);
    setReport(null);
    setError(null);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <Tabs defaultValue="message">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="message" className="gap-1.5">
                <MessageSquareText className="h-3.5 w-3.5" />
                Message
              </TabsTrigger>
              <TabsTrigger value="headers" className="gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email headers
              </TabsTrigger>
              <TabsTrigger value="screenshot" className="gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Screenshot
              </TabsTrigger>
            </TabsList>

            <TabsContent value="message" className="mt-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste the suspicious email, text message, DM, or job offer here…"
                className="min-h-44 resize-y font-mono text-sm"
              />
            </TabsContent>

            <TabsContent value="headers" className="mt-4 flex flex-col gap-2">
              <p className="text-muted-foreground text-xs">
                Optional: paste the raw email headers (in Gmail: ⋮ → Show
                original) to check SPF/DKIM/DMARC and sender spoofing.
              </p>
              <Textarea
                value={rawHeaders}
                onChange={(e) => setRawHeaders(e.target.value)}
                placeholder={"From: …\nReply-To: …\nAuthentication-Results: …"}
                className="min-h-36 resize-y font-mono text-xs"
              />
            </TabsContent>

            <TabsContent value="screenshot" className="mt-4 flex flex-col gap-3">
              <p className="text-muted-foreground text-xs">
                Upload a screenshot of the chat or profile — the AI reads the
                text straight from the image.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {image ? (
                <div className="border-border bg-muted/40 flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
                    {image.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setImage(null)}
                    aria-label="Remove screenshot"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-dashed py-8"
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Choose an image…
                </Button>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">Try a sample:</span>
            {SAMPLES.map((sample) => (
              <Badge
                key={sample.id}
                variant="outline"
                className="hover:bg-accent cursor-pointer"
                title={sample.description}
                onClick={() => loadSample(sample.id)}
              >
                {sample.label}
              </Badge>
            ))}
          </div>

          {error && (
            <p className="text-sm font-medium text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={scan} disabled={loading} className="gap-2" size="lg">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanSearch className="h-4 w-4" />
              )}
              {loading ? "Analyzing…" : "Scan it"}
            </Button>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowHistory((v) => !v)}
              >
                <History className="h-4 w-4" />
                History ({history.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showHistory && history.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-1 pt-4">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-semibold">Recent scans</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-7 gap-1 text-xs"
                onClick={() => saveHistory([])}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
            {history.map((entry) => (
              <button
                key={entry.id}
                className="hover:bg-accent flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm"
                onClick={() => {
                  setReport(entry.report);
                  setShowHistory(false);
                  requestAnimationFrame(() =>
                    resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
                  );
                }}
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    VERDICT_DOT[entry.verdict],
                  )}
                />
                <span className="flex-1 truncate">{entry.preview}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {entry.score}/100
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div ref={resultsRef} className="scroll-mt-6">
        {loading && (
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="flex items-center gap-3">
                <FileSearch className="text-muted-foreground h-5 w-5 animate-pulse" />
                <p className="text-muted-foreground text-sm">
                  Running AI analysis and technical forensics…
                </p>
              </div>
              <div className="flex gap-6">
                <Skeleton className="h-40 w-40 rounded-full" />
                <div className="flex flex-1 flex-col gap-3 py-4">
                  <Skeleton className="h-7 w-2/5" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {report && !loading && <ReportView report={report} />}
      </div>
    </div>
  );
}
