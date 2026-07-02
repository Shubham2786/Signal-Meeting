import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Tooltip primitives (shadcn/ui-style wrapper over Radix). Tooltips open after
 * ~200ms (set on the app-level provider) and are keyboard accessible: focusing
 * the trigger shows the tooltip, Escape dismisses it.
 */
export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  children,
  side = "top",
  className,
}: {
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        sideOffset={6}
        className={cn(
          "z-[60] select-none rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text shadow-md",
          "data-[state=delayed-open]:animate-fade-in",
          className
        )}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-[rgb(var(--surface-2))]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

/** Convenience: wrap any element with a tooltip label. */
export function Tooltip({
  label,
  side = "top",
  children,
}: {
  label: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
}) {
  return (
    <TooltipRoot>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </TooltipRoot>
  );
}
