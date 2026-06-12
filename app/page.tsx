import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Scanner } from "@/components/scanner";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:py-16">
      <header className="flex flex-col items-center gap-4 text-center">
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          AI + forensics scam detection
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          UKnow<span className="text-primary">Who</span>?
        </h1>
        <p className="text-muted-foreground max-w-xl text-balance">
          Got a message that feels off? Paste it below. UKnowWho combines
          Claude&apos;s fraud analysis with hard technical forensics — sender
          authentication, lookalike-domain detection, link inspection — and
          tells you in seconds whether you&apos;re talking to who you think you
          are.
        </p>
      </header>
      <Scanner />
      <footer className="text-muted-foreground pb-6 text-center text-xs">
        Built for the Vortexa Hackathon 2026 · AI &amp; Cyber Security track ·
        Nothing you scan is stored on our servers.
      </footer>
    </main>
  );
}
