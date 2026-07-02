import type {
    ActionItem,
    Health,
    Meeting,
    MeetingWithItems,
    Status,
} from "./types";

/** Error thrown by the API client, carrying the server's stable code. */
export class ApiError extends Error {
    constructor(public readonly code: string, message: string) {
        super(message);
        this.name = "ApiError";
    }
}

async function request<T>(
    path: string,
    init?: RequestInit
): Promise<T> {
    // Only send a JSON content-type when there is a body, so bodyless POSTs
    // (follow-up, github-issue) don't trip the server's JSON parser.
    const headers: Record<string, string> = {
        ...((init?.headers as Record<string, string>) ?? {}),
    };
    if (init?.body != null) headers["Content-Type"] = "application/json";

    let res: Response;
    try {
        res = await fetch(path, { ...init, headers });
    } catch {
        throw new ApiError("network", "Cannot reach the server. Is it running?");
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
        const code = data?.error?.code ?? "error";
        const message = data?.error?.message ?? `Request failed (${res.status}).`;
        throw new ApiError(code, message);
    }
    return data as T;
}

export interface ActionItemFilters {
    meetingId?: string;
    owner?: string;
    status?: Status;
    overdue?: boolean;
    search?: string;
    sort?: "dueDate" | "confidence" | "createdAt";
    order?: "asc" | "desc";
}

export const api = {
    health: () => request<Health>("/health"),

    listMeetings: () =>
        request<{ meetings: Meeting[] }>("/meetings").then((r) => r.meetings),

    getMeeting: (id: string) => request<MeetingWithItems>(`/meetings/${id}`),

    createMeeting: (transcript: string, title?: string) =>
        request<MeetingWithItems>("/meetings", {
            method: "POST",
            body: JSON.stringify({ transcript, title }),
        }),

    transcribeAudio: async (file: File): Promise<MeetingWithItems> => {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/meetings/transcribe-audio", {
            method: "POST",
            body: form,
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) {
            throw new ApiError(
                data?.error?.code ?? "error",
                data?.error?.message ?? "Audio processing failed."
            );
        }
        return data as MeetingWithItems;
    },

    queryItems: (filters: ActionItemFilters) => {
        const qs = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
        });
        const q = qs.toString();
        return request<{ items: ActionItem[] }>(
            `/action-items${q ? `?${q}` : ""}`
        ).then((r) => r.items);
    },

    updateItem: (id: string, patch: Partial<ActionItem>) =>
        request<ActionItem>(`/action-items/${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
        }),

    followUp: (meetingId: string) =>
        request<{ draft: string }>(`/meetings/${meetingId}/follow-up`, {
            method: "POST",
        }).then((r) => r.draft),

    githubIssue: (itemId: string) =>
        request<{ issue: { url: string; number: number } }>(
            `/action-items/${itemId}/github-issue`,
            { method: "POST" }
        ).then((r) => r.issue),

    exportMarkdownUrl: (meetingId: string) => `/meetings/${meetingId}/export.md`,
    exportIcsUrl: (meetingId: string) => `/meetings/${meetingId}/export.ics`,
};
