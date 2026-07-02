import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 ease-out-soft select-none active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-focus";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-fg hover:bg-[rgb(130_143_255)] shadow-sm hover:shadow-md",
  secondary:
    "bg-surface text-text border border-border hover:bg-surface-2 hover:border-[rgb(var(--border))] active:bg-surface-2",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  danger:
    "bg-danger text-white hover:brightness-110 active:brightness-95 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm min-w-8",
  md: "h-10 px-4 text-sm min-w-10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
    ref
  ) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
