import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const base =
  "w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-muted transition-colors focus-visible:border-primary focus-visible:outline-focus resize-y leading-relaxed";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...rest }, ref) => (
  <textarea ref={ref} className={cn(base, className)} {...rest} />
));
Textarea.displayName = "Textarea";
