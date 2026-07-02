import { Circle, CircleDot, CheckCircle2 } from "lucide-react";
import { Badge } from "./Badge";
import { STATUS_LABELS, type Status } from "../../lib/types";

const config: Record<
  Status,
  { tone: "neutral" | "primary" | "success"; Icon: typeof Circle }
> = {
  open: { tone: "neutral", Icon: Circle },
  in_progress: { tone: "primary", Icon: CircleDot },
  done: { tone: "success", Icon: CheckCircle2 },
};

export function StatusBadge({ status }: { status: Status }) {
  const { tone, Icon } = config[status];
  return (
    <Badge tone={tone}>
      <Icon className="h-3 w-3" aria-hidden />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
