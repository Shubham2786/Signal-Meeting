// Frontend mirror of the backend/domain shapes. Validated at the boundary
// in api.ts. Kept in sync with @signal/core types by hand.

export type Status = "open" | "in_progress" | "done";
export type SourceType = "text" | "audio";

export interface ActionItem {
    id: string;
    meetingId: string;
    title: string;
    owner: string;
    dueDate: string | null;
    followUp: string | null;
    sourceQuote: string;
    confidence: number;
    status: Status;
    confirmed: boolean;
    duplicateOf?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Meeting {
    id: string;
    title: string;
    createdAt: string;
    transcript: string;
    sourceType: SourceType;
    tldr: string;
    decisions: string[];
}

export interface MeetingWithItems extends Meeting {
    actionItems: ActionItem[];
}

export interface Health {
    status: string;
    aiMode: "stub" | "gemini" | "groq";
    dbMode?: "sqlite" | "supabase";
    githubEnabled: boolean;
}

export interface ApiErrorShape {
    error: { code: string; message: string };
}

export const STATUS_LABELS: Record<Status, string> = {
    open: "Open",
    in_progress: "In Progress",
    done: "Done",
};

export const STATUS_ORDER: Status[] = ["open", "in_progress", "done"];
