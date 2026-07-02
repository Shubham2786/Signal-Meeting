import { initials } from "../../lib/format";
import { cn } from "../../lib/cn";

/** Deterministic subtle color from the name for gentle differentiation. */
function hueFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const unassigned = !name || name === "Unassigned";
  const hue = hueFor(name || "?");
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
        unassigned && "bg-surface-2 text-muted",
        className
      )}
      style={
        unassigned
          ? undefined
          : {
              backgroundColor: `hsl(${hue} 70% 92%)`,
              color: `hsl(${hue} 55% 32%)`,
            }
      }
      aria-hidden
      title={name}
    >
      {initials(name)}
    </span>
  );
}
