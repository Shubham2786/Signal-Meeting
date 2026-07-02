import type { SupabaseClient } from "@supabase/supabase-js";
import type {
    Meeting,
    MeetingRepository,
    MeetingWithItems,
} from "@signal/core";
import { dbError } from "./client.js";
import {
    meetingToRow,
    rowToItem,
    rowToMeeting,
    type ItemRow,
    type MeetingRow,
} from "./mappers.js";

export class SupabaseMeetingRepository implements MeetingRepository {
    constructor(private readonly db: SupabaseClient) { }

    async create(m: Meeting): Promise<Meeting> {
        const { error } = await this.db.from("meetings").insert(meetingToRow(m));
        if (error) throw dbError(error, "Failed to create meeting");
        return m;
    }

    async getById(id: string): Promise<MeetingWithItems | null> {
        const { data: mRow, error } = await this.db
            .from("meetings")
            .select("*")
            .eq("id", id)
            .maybeSingle();
        if (error) throw dbError(error, "Failed to load meeting");
        if (!mRow) return null;
        const { data: itemRows, error: iErr } = await this.db
            .from("action_items")
            .select("*")
            .eq("meeting_id", id)
            .order("created_at", { ascending: true });
        if (iErr) throw dbError(iErr, "Failed to load items");
        return {
            ...rowToMeeting(mRow as MeetingRow),
            actionItems: ((itemRows as ItemRow[]) ?? []).map(rowToItem),
        };
    }

    async list(): Promise<Meeting[]> {
        const { data, error } = await this.db
            .from("meetings")
            .select("*")
            .order("created_at", { ascending: false });
        if (error) throw dbError(error, "Failed to list meetings");
        return ((data as MeetingRow[]) ?? []).map(rowToMeeting);
    }

    async update(
        id: string,
        patch: Partial<Pick<Meeting, "title" | "tldr" | "decisions" | "transcript">>
    ): Promise<Meeting | null> {
        const row: Record<string, unknown> = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.tldr !== undefined) row.tldr = patch.tldr;
        if (patch.transcript !== undefined) row.transcript = patch.transcript;
        if (patch.decisions !== undefined) row.decisions = patch.decisions;
        const { data, error } = await this.db
            .from("meetings")
            .update(row)
            .eq("id", id)
            .select("*")
            .maybeSingle();
        if (error) throw dbError(error, "Failed to update meeting");
        return data ? rowToMeeting(data as MeetingRow) : null;
    }
}
