import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { Health, Meeting } from "./types";

/** Fetch server health once (AI mode, GitHub availability). */
export function useHealth(): Health | null {
    const [health, setHealth] = useState<Health | null>(null);
    useEffect(() => {
        let alive = true;
        api.health().then(
            (h) => alive && setHealth(h),
            () => alive && setHealth(null)
        );
        return () => {
            alive = false;
        };
    }, []);
    return health;
}

interface MeetingsState {
    meetings: Meeting[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/** Meeting history list with refresh. */
export function useMeetings(): MeetingsState {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const list = await api.listMeetings();
            setMeetings(list);
            setError(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load meetings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { meetings, loading, error, refresh };
}

/** Autosave a value to localStorage (debounced). */
export function useLocalDraft(key: string, initial = "") {
    const [value, setValue] = useState<string>(() => {
        try {
            return localStorage.getItem(key) ?? initial;
        } catch {
            return initial;
        }
    });
    const timer = useRef<number | undefined>(undefined);
    useEffect(() => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            try {
                if (value) localStorage.setItem(key, value);
                else localStorage.removeItem(key);
            } catch {
                /* ignore */
            }
        }, 400);
        return () => window.clearTimeout(timer.current);
    }, [key, value]);
    const clear = useCallback(() => {
        try {
            localStorage.removeItem(key);
        } catch {
            /* ignore */
        }
        setValue("");
    }, [key]);
    return { value, setValue, clear };
}
