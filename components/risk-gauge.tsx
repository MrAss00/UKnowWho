"use client";

import { useEffect, useState } from "react";
import type { Verdict } from "@/lib/schema";

const VERDICT_COLOR: Record<Verdict, string> = {
  safe: "var(--color-emerald-500, #10b981)",
  caution: "var(--color-amber-500, #f59e0b)",
  dangerous: "var(--color-red-500, #ef4444)",
};

export function RiskGauge({
  score,
  verdict,
}: {
  score: number;
  verdict: Verdict;
}) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimated(score));
    return () => cancelAnimationFrame(frame);
  }, [score]);

  // 270° arc from 135° to 405°.
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const filled = arcLength * (animated / 100);
  const color = VERDICT_COLOR[verdict];

  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-[135deg]">
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          className="text-muted opacity-30"
          strokeDasharray={`${arcLength} ${circumference}`}
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 900ms ease-out, stroke 300ms" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
          risk score
        </span>
      </div>
    </div>
  );
}
