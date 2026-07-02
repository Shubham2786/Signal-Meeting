import type { SupabaseClient } from "@supabase/supabase-js";
import {
    isOverdue,
    type ActionItem,
    type ActionItemQuery,
    type ActionItemRepository,
} from "@signal/core";
import { dbError } from "./client.js";
import { itemToRow, rowToItem, type ItemRow } from "./mappers.js";

export class SupabaseActionItemRepository implements ActionItemRepository {
    constructor(private readonly db: SupabaseClient) { }

    async createMany(items: ActionItem[]): Promise<ActionItem[]> {
        if (items.length === 0) return [];
        const { error } = await this.db
            .from("action_items")
            .insert(items.map(itemToRow));
        if (error) throw dbError(error, "Failed to create items");
        return items;
    }

    async getById(id: string): Promise<ActionItem | null> {
        const { data, error } = await this.db
            .from("action_items")
            .select("*")
            .eq("id", id)
            .maybeSingle();
        if (error) throw dbError(error, "Failed to load item");
        return data ? rowToItem(data as ItemRow) : null;
    }

    async listByMeeting(meetingId: string): Promise<ActionItem[]> {
        const { data, error } = await this.db
            .from("action_items")
            .select("*")
            .eq("meeting_id", meetingId)
            .order("created_at", { ascending: true });
        if (error) throw dbError(error, "Failed to list items");
        return ((data as ItemRow[]) ?? []).map(rowToItem);
    }

    async query(q: ActionItemQuery): Promise<ActionItem[]> {
        let builder = this.db.from("action_items").select("*");
        if (q.meetingId) builder = builder.eq("meeting_id", q.meetingId);
        if (q.owner) builder = builder.eq("owner", q.owner);
        if (q.status) builder = builder.eq("status", q.status);
        if (q.search) builder = builder.ilike("title", `%${q.search}%`);

        const sortCol =
            q.sort === "dueDate"
                ? "due_date"
                : q.sort === "confidence"
                    ? "confidence"
                    : "created_at";
        builder = builder.order(sortCol, {
            ascending: q.order !== "desc",
            nullsFirst: false,
        });

        const { data, error } = await builder;
        if (error) throw dbError(error, "Failed to query items");
        let items = ((data as ItemRow[]) ?? []).map(rowToItem);
        if (q.overdue) {
            items = items.filter((i) => i.status !== "done" && isOverdue(i.dueDate));
        }
        return items;
    }

    async update(id: string, patch: Partial<ActionItem>): Promise<ActionItem | null> {
        const existing = await this.getById(id);
        if (!existing) return null;
        const next: ActionItem = {
            ...existing,
            ...patch,
            updatedAt: new Date().toISOString(),
        };
        const { data, error } = await this.db
            .from("action_items")
            .update(itemToRow(next))
            .eq("id", id)
            .select("*")
            .maybeSingle();
        if (error) throw dbError(error, "Failed to update item");
        return data ? rowToItem(data as ItemRow) : null;
    }
}
