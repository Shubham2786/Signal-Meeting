import { forwardRef, type ReactNode } from "react";
import { Button } from "./Button";
import { Tooltip } from "./Tooltip";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface Props {
  /** Accessible label + tooltip text. */
  label: string;
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: Variant;
  size?: Size;
  side?: "top" | "right" | "bottom" | "left";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Icon-only button with an accessible tooltip. The tooltip text doubles as the
 * `aria-label`, so it works for both pointer and screen-reader users.
 */
export const TooltipIconButton = forwardRef<HTMLButtonElement, Props>(
  ({ label, children, side = "top", ...rest }, ref) => (
    <Tooltip label={label} side={side}>
      <Button ref={ref} aria-label={label} {...rest}>
        {children}
      </Button>
    </Tooltip>
  )
);
TooltipIconButton.displayName = "TooltipIconButton";
