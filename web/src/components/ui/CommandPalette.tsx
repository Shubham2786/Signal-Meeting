import { Command } from "cmdk";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { usePrefersReducedMotion } from "../../lib/theme";

export interface CommandAction {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  perform: () => void;
  group?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CommandAction[];
}

export function CommandPalette({ open, onOpenChange, actions }: Props) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const groups = Array.from(new Set(actions.map((a) => a.group ?? "Actions")));

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            aria-hidden
          />
          <motion.div
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
            initial={reduced ? false : { opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <Command label="Command palette" className="w-full">
              <Command.Input
                autoFocus
                placeholder="Type a command…"
                className="h-12 w-full border-b border-border bg-transparent px-4 text-sm text-text placeholder:text-muted focus:outline-none"
              />
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
                  No matching commands.
                </Command.Empty>
                {groups.map((group) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="px-1 pb-1 pt-2 text-xs font-medium text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1"
                  >
                    {actions
                      .filter((a) => (a.group ?? "Actions") === group)
                      .map((a) => {
                        const Icon = a.icon;
                        return (
                          <Command.Item
                            key={a.id}
                            value={a.label}
                            onSelect={() => {
                              a.perform();
                              onOpenChange(false);
                            }}
                            className="flex cursor-default items-center gap-3 rounded-md px-3 py-2 text-sm text-text aria-selected:bg-primary/10 aria-selected:text-text"
                          >
                            <Icon className="h-4 w-4 text-muted" aria-hidden />
                            <span className="flex-1">{a.label}</span>
                            {a.shortcut && (
                              <kbd className="tnum rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                                {a.shortcut}
                              </kbd>
                            )}
                          </Command.Item>
                        );
                      })}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
