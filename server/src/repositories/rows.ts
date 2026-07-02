import type { ActionItem, Meeting, Status } from "@signal/core";

export interface MeetingRow {
    id: string;
    title: string;
    created_at: string;
    transcript: string;
    source_type: string;
    tldr: string;
    decisions: string;
}

export interface ItemRow {
    id: string;
    meeting_id: string;
    title: string;
    owner: string;
    due_date: string | null;
    follow_up: string | null;
    source_quote: string;
    confidence: number;
    status: string;
    confirmed: number;
    duplicate_of: string | null;
    created_at: string;
    updated_at: string;
}

export function rowToMeeting(r: MeetingRow): Meeting {
    return {
        id: r.id,
        title: r.title,
        createdAt: r.created_at,
        transcript: r.transcript,
        sourceType: r.source_type === "audio" ? "audio" : "text",
        tldr: r.tldr,
        decisions: safeParseArray(r.decisions),
    };
}

export function rowToItem(r: ItemRow): ActionItem {
    return {
        id: r.id,
        meetingId: r.meeting_id,
        title: r.title,
        owner: r.owner,
        dueDate: r.due_date,
        followUp: r.follow_up,
        sourceQuote: r.source_quote,
        confidence: r.confidence,
        status: (r.status as Status) ?? "open",
        confirmed: r.confirmed === 1,
        duplicateOf: r.duplicate_of,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}

function safeParseArray(json: string): string[] {
    try {
        const v = JSON.parse(json);
        return Array.isArray(v) ? v.map(String) : [];
    } catch {
        return [];
    }
}
