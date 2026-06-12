import { NextRequest, NextResponse } from "next/server";
import { ScanRequestSchema } from "@/lib/schema";
import { analyze, AiUnavailableError } from "@/lib/ai";
import { analyzeHeaders } from "@/lib/forensics/headers";
import { analyzeLinks } from "@/lib/forensics/links";
import { youngDomainSignals } from "@/lib/forensics/rdap";
import { buildReport } from "@/lib/score";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON" },
      { status: 400 },
    );
  }

  const parsed = ScanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { content, rawHeaders, imageBase64, imageMediaType } = parsed.data;

  const headerAnalysis = rawHeaders?.trim() ? analyzeHeaders(rawHeaders) : null;
  const linkAnalysis = analyzeLinks(
    rawHeaders ? `${content}\n${rawHeaders}` : content,
  );

  // AI analysis and RDAP lookups run concurrently; both degrade gracefully.
  const [aiResult, domainSignals] = await Promise.all([
    analyze({ content, imageBase64, imageMediaType })
      .then((ai) => ({ ai, notice: null as string | null }))
      .catch((error) => {
        if (error instanceof AiUnavailableError) {
          return { ai: null, notice: error.message };
        }
        throw error;
      }),
    youngDomainSignals(linkAnalysis.links.map((l) => l.domain)).catch(
      () => [],
    ),
  ]);

  const report = buildReport({
    ai: aiResult.ai,
    aiNotice: aiResult.notice,
    headerAnalysis,
    linkAnalysis,
    extraSignals: domainSignals,
  });

  return NextResponse.json(report);
}
