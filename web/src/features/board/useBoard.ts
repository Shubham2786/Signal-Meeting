import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import type { ActionItem, MeetingWithItems } from "../../lib/types";

export interface BoardState {
    meeting: MeetingWithItems | null;
    items: ActionItem[];
    loading: boolean;
    error: string | null;
    reload: () => Promise<void>;
    patchItem: (id: string, patch: Partial<ActionItem>, opts?: { silent?: boolean; undo?: boolean }) => Promise<void>;
}

/**
 * Loads a meeting + its items and applies optimistic updates with rollback.
 * Status changes and dismissals can offer an undo toast.
 */
export function useBoard(meetingId: string | null): BoardState {
    const [meeting, setMeeting] = useState<MeetingWithItems | null>(null);
    const [items, setItems] = useState<ActionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        if (!meetingId) {
            setMeeting(null);
            setItems([]);
            return;
        }
        setLoading(true);
        try {
            const m = await api.getMeeting(meetingId);
            setMeeting(m);
            setItems(m.actionItems);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load meeting.");
        } finally {
            setLoading(false);
        }
    }, [meetingId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const patchItem = useCallback<BoardState["patchItem"]>(
        async (id, patch, opts) => {
            const prev = items.find((i) => i.id === id);
            if (!prev) return;
            // Optimistic
            setItems((cur) =>
                cur.map((i) => (i.id === id ? { ...i, ...patch } : i))
            );
            try {
                const updated = await api.updateItem(id, patch);
                setItems((cur) => cur.map((i) => (i.id === id ? updated : i)));
                if (opts?.undo) {
                    toast.success("Updated", {
                        action: {
                            label: "Undo",
                            onClick: () => {
                                void api
                                    .updateItem(id, {
                                        status: prev.status,
                                        confirmed: prev.confirmed,
                                        owner: prev.owner,
                                    })
                                    .then((rolled) =>
                                        setItems((cur) =>
                                            cur.map((i) => (i.id === id ? rolled : i))
                                        )
                                    );
                            },
                        },
                    });
                }
            } catch (e) {
                // Roll back
                setItems((cur) => cur.map((i) => (i.id === id ? prev : i)));
                if (!opts?.silent) {
                    toast.error(e instanceof Error ? e.message : "Update failed.");
                }
            }
        },
        [items]
    );

    return { meeting, items, loading, error, reload, patchItem };
}
