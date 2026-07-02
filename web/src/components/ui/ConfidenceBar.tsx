import { confidencePct } from "../../lib/format";
import { cn } from "../../lib/cn";

/**
 * Confidence shown as a subtle bar/pill — never alarming.
 * High = primary, medium = warning tint, low = muted.
 */
export function ConfidenceBar({ value }: { value: number }) {
  const pct = confidencePct(value);
  const tone =
    value >= 0.8 ? "bg-primary" : value >= 0.6 ? "bg-warning" : "bg-muted";
  return (
    <div
      className="flex items-center gap-1.5"
      title={`Model confidence: ${pct}%`}
      aria-label={`Confidence ${pct} percent`}
    >
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tnum text-xs text-muted">{pct}%</span>
    </div>
  );
}
