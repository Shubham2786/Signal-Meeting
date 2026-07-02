import type Database from "better-sqlite3";
import {
    isOverdue,
    type ActionItem,
    type ActionItemQuery,
    type ActionItemRepository,
} from "@signal/core";
import { rowToItem, type ItemRow } from "./rows.js";

export class SqliteActionItemRepository implements ActionItemRepository {
    constructor(private readonly db: Database.Database) { }

    async createMany(items: ActionItem[]): Promise<ActionItem[]> {
        const stmt = this.db.prepare(
            `INSERT INTO action_items
       (id, meeting_id, title, owner, due_date, follow_up, source_quote,
        confidence, status, confirmed, duplicate_of, created_at, updated_at)
       VALUES
       (@id, @meeting_id, @title, @owner, @due_date, @follow_up, @source_quote,
        @confidence, @status, @confirmed, @duplicate_of, @created_at, @updated_at)`
        );
        const tx = this.db.transaction((rows: ActionItem[]) => {
            for (const i of rows) {
                stmt.run({
                    id: i.id,
                    meeting_id: i.meetingId,
                    title: i.title,
                    owner: i.owner,
                    due_date: i.dueDate,
                    follow_up: i.followUp,
                    source_quote: i.sourceQuote,
                    confidence: i.confidence,
                    status: i.status,
                    confirmed: i.confirmed ? 1 : 0,
                    duplicate_of: i.duplicateOf ?? null,
                    created_at: i.createdAt,
                    updated_at: i.updatedAt,
                });
            }
        });
        tx(items);
        return items;
    }

    async getById(id: string): Promise<ActionItem | null> {
        const row = this.db
            .prepare(`SELECT * FROM action_items WHERE id = ?`)
            .get(id) as ItemRow | undefined;
        return row ? rowToItem(row) : null;
    }

    async listByMeeting(meetingId: string): Promise<ActionItem[]> {
        const rows = this.db
            .prepare(
                `SELECT * FROM action_items WHERE meeting_id = ? ORDER BY created_at ASC`
            )
            .all(meetingId) as ItemRow[];
        return rows.map(rowToItem);
    }

    async query(q: ActionItemQuery): Promise<ActionItem[]> {
        const clauses: string[] = [];
        const params: Record<string, unknown> = {};
        if (q.meetingId) {
            clauses.push("meeting_id = @meetingId");
            params.meetingId = q.meetingId;
        }
        if (q.owner) {
            clauses.push("owner = @owner");
            params.owner = q.owner;
        }
        if (q.status) {
            clauses.push("status = @status");
            params.status = q.status;
        }
        if (q.search) {
            clauses.push("(LOWER(title) LIKE @search OR LOWER(owner) LIKE @search)");
            params.search = `%${q.search.toLowerCase()}%`;
        }
        const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

        const sortCol =
            q.sort === "dueDate"
                ? "due_date"
                : q.sort === "confidence"
                    ? "confidence"
                    : "created_at";
        const order = q.order === "desc" ? "DESC" : "ASC";
        // NULLS handling: keep undated items last when sorting by dueDate asc.
        const nullsClause =
            q.sort === "dueDate" ? `due_date IS NULL ${order === "ASC" ? "ASC" : "DESC"}, ` : "";

        const rows = this.db
            .prepare(`SELECT * FROM action_items ${where} ORDER BY ${nullsClause}${sortCol} ${order}`)
            .all(params) as ItemRow[];

        let items = rows.map(rowToItem);
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
        this.db
            .prepare(
                `UPDATE action_items SET
          title=@title, owner=@owner, due_date=@due_date, follow_up=@follow_up,
          source_quote=@source_quote, confidence=@confidence, status=@status,
          confirmed=@confirmed, duplicate_of=@duplicate_of, updated_at=@updated_at
         WHERE id=@id`
            )
            .run({
                id,
                title: next.title,
                owner: next.owner,
                due_date: next.dueDate,
                follow_up: next.followUp,
                source_quote: next.sourceQuote,
                confidence: next.confidence,
                status: next.status,
                confirmed: next.confirmed ? 1 : 0,
                duplicate_of: next.duplicateOf ?? null,
                updated_at: next.updatedAt,
            });
        return next;
    }
}
