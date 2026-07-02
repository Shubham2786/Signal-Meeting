import type { ActionItem, Meeting, Status } from "@signal/core";

/** Supabase rows use snake_case columns; decisions is jsonb, confirmed is boolean. */
export interface MeetingRow {
    id: string;
    title: string;
    created_at: string;
    transcript: string;
    source_type: string;
    tldr: string;
    decisions: unknown; // jsonb → string[]
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
    confirmed: boolean;
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
        tldr: r.tldr ?? "",
        decisions: Array.isArray(r.decisions) ? (r.decisions as string[]).map(String) : [],
    };
}

export function meetingToRow(m: Meeting): MeetingRow {
    return {
        id: m.id,
        title: m.title,
        created_at: m.createdAt,
        transcript: m.transcript,
        source_type: m.sourceType,
        tldr: m.tldr,
        decisions: m.decisions ?? [],
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
        confirmed: !!r.confirmed,
        duplicateOf: r.duplicate_of,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}

export function itemToRow(i: ActionItem): ItemRow {
    return {
        id: i.id,
        meeting_id: i.meetingId,
        title: i.title,
        owner: i.owner,
        due_date: i.dueDate,
        follow_up: i.followUp,
        source_quote: i.sourceQuote,
        confidence: i.confidence,
        status: i.status,
        confirmed: i.confirmed,
        duplicate_of: i.duplicateOf ?? null,
        created_at: i.createdAt,
        updated_at: i.updatedAt,
    };
}
