import { Command, Cpu, Github, Database } from "lucide-react";
import type { Health } from "../../lib/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  health: Health | null;
  onOpenPalette: () => void;
}

const AI_LABEL: Record<string, string> = {
  groq: "Groq",
  gemini: "Gemini",
  stub: "Stub AI",
};

export function AppBar({ health, onOpenPalette }: Props) {
  const aiMode = health?.aiMode ?? "stub";
  const isReal = aiMode === "groq" || aiMode === "gemini";
  return (
    <header className="gradient-accent flex items-center justify-between border-b border-border px-6 py-3">
      <div className="flex items-center gap-2">
        <Badge tone={isReal ? "success" : "primary"}>
          <Cpu className="h-3 w-3" aria-hidden />
          {health ? AI_LABEL[aiMode] : "…"}
        </Badge>
        {health?.dbMode === "supabase" && (
          <Badge tone="neutral">
            <Database className="h-3 w-3" aria-hidden /> Supabase
          </Badge>
        )}
        {health?.githubEnabled && (
          <Badge tone="neutral">
            <Github className="h-3 w-3" aria-hidden /> GitHub linked
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenPalette}
          className="gap-2 text-muted"
        >
          <Command className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Command</span>
          <kbd className="ml-1 rounded border border-border bg-surface-2 px-1.5 text-[10px] tnum">
            ⌘K
          </kbd>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
