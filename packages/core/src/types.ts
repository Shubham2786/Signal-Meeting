/**
 * Domain types for Signal Meetings.
 * Pure data shapes — no framework imports.
 */

export type Status = "open" | "in_progress" | "done";
export const STATUSES: Status[] = ["open", "in_progress", "done"];

export type SourceType = "text" | "audio";

export interface ActionItem {
    id: string;
    meetingId: string;
    title: string;
    owner: string;
    /** ISO 8601 date (YYYY-MM-DD) or null. */
    dueDate: string | null;
    followUp: string | null;
    /** Verbatim transcript snippet that justifies this item. */
    sourceQuote: string;
    /** 0..1 model confidence. */
    confidence: number;
    status: Status;
    confirmed: boolean;
    /** Set when duplicate detection flags this against another item. */
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

/** Raw shape returned by an AIProvider extraction (pre-persistence). */
export interface ExtractedActionItem {
    title: string;
    owner: string;
    dueDate: string | null;
    followUp: string | null;
    sourceQuote: string;
    confidence: number;
}

export interface ExtractionResult {
    tldr: string;
    decisions: string[];
    actionItems: ExtractedActionItem[];
}
