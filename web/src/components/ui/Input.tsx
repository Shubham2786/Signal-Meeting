import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const base =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-muted transition-colors focus-visible:border-primary focus-visible:outline-focus";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={cn(base, className)} {...rest} />
  )
);
Input.displayName = "Input";
