import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <Badge variant="outline">Vortexa Hackathon 2026</Badge>
      <h1 className="text-4xl font-bold tracking-tight">UKnowWho</h1>
      <p className="text-muted-foreground max-w-md text-center">
        Know who you&apos;re really talking to. AI-powered impersonation &amp;
        scam detection — coming together right now.
      </p>
    </main>
  );
}
