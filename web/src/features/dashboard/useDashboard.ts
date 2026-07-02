import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { isOverdue } from "../../lib/format";
import type { ActionItem, Meeting, Status } from "../../lib/types";

export interface OwnerLoad {
    owner: string;
    open: number;
    inProgress: number;
    done: number;
    total: number;
}

export interface DashboardData {
    loading: boolean;
    error: string | null;
    meetings: Meeting[];
    totalMeetings: number;
    totalItems: number;
    byStatus: Record<Status, number>;
    overdue: number;
    completion: number; // 0..100
    upcoming: ActionItem[]; // dated, not done, soonest first
    owners: OwnerLoad[];
    recentMeetings: Meeting[];
    refresh: () => Promise<void>;
}

/**
 * Aggregates a lightweight execution overview across all meetings from the
 * existing endpoints (GET /meetings + GET /action-items). Counts confirmed
 * items only — i.e. what has actually landed on the board.
 */
export function useDashboard(): DashboardData {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [items, setItems] = useState<ActionItem[]>([]);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [ms, its] = await Promise.all([
                api.listMeetings(),
                api.queryItems({}),
            ]);
            setMeetings(ms);
            setItems(its.filter((i) => i.confirmed));
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load dashboard.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const byStatus: Record<Status, number> = {
        open: items.filter((i) => i.status === "open").length,
        in_progress: items.filter((i) => i.status === "in_progress").length,
        done: items.filter((i) => i.status === "done").length,
    };
    const overdue = items.filter(
        (i) => i.status !== "done" && isOverdue(i.dueDate)
    ).length;
    const completion =
        items.length === 0 ? 0 : Math.round((byStatus.done / items.length) * 100);

    const upcoming = [...items]
        .filter((i) => i.status !== "done" && i.dueDate)
        .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
        .slice(0, 6);

    const ownerMap = new Map<string, OwnerLoad>();
    for (const i of items) {
        const cur =
            ownerMap.get(i.owner) ??
            { owner: i.owner, open: 0, inProgress: 0, done: 0, total: 0 };
        if (i.status === "open") cur.open++;
        else if (i.status === "in_progress") cur.inProgress++;
        else cur.done++;
        cur.total++;
        ownerMap.set(i.owner, cur);
    }
    const owners = [...ownerMap.values()].sort((a, b) => b.total - a.total).slice(0, 6);

    return {
        loading,
        error,
        meetings,
        totalMeetings: meetings.length,
        totalItems: items.length,
        byStatus,
        overdue,
        completion,
        upcoming,
        owners,
        recentMeetings: meetings.slice(0, 5),
        refresh,
    };
}
