import type Database from "better-sqlite3";
import type {
    Meeting,
    MeetingRepository,
    MeetingWithItems,
} from "@signal/core";
import { rowToItem, rowToMeeting, type ItemRow, type MeetingRow } from "./rows.js";

export class SqliteMeetingRepository implements MeetingRepository {
    constructor(private readonly db: Database.Database) { }

    async create(m: Meeting): Promise<Meeting> {
        this.db
            .prepare(
                `INSERT INTO meetings (id, title, created_at, transcript, source_type, tldr, decisions)
         VALUES (@id, @title, @created_at, @transcript, @source_type, @tldr, @decisions)`
            )
            .run({
                id: m.id,
                title: m.title,
                created_at: m.createdAt,
                transcript: m.transcript,
                source_type: m.sourceType,
                tldr: m.tldr,
                decisions: JSON.stringify(m.decisions ?? []),
            });
        return m;
    }

    async getById(id: string): Promise<MeetingWithItems | null> {
        const row = this.db
            .prepare(`SELECT * FROM meetings WHERE id = ?`)
            .get(id) as MeetingRow | undefined;
        if (!row) return null;
        const itemRows = this.db
            .prepare(`SELECT * FROM action_items WHERE meeting_id = ? ORDER BY created_at ASC`)
            .all(id) as ItemRow[];
        return {
            ...rowToMeeting(row),
            actionItems: itemRows.map(rowToItem),
        };
    }

    async list(): Promise<Meeting[]> {
        const rows = this.db
            .prepare(`SELECT * FROM meetings ORDER BY created_at DESC`)
            .all() as MeetingRow[];
        return rows.map(rowToMeeting);
    }

    async update(
        id: string,
        patch: Partial<Pick<Meeting, "title" | "tldr" | "decisions" | "transcript">>
    ): Promise<Meeting | null> {
        const existing = this.db
            .prepare(`SELECT * FROM meetings WHERE id = ?`)
            .get(id) as MeetingRow | undefined;
        if (!existing) return null;
        const merged = {
            title: patch.title ?? existing.title,
            tldr: patch.tldr ?? existing.tldr,
            transcript: patch.transcript ?? existing.transcript,
            decisions: JSON.stringify(patch.decisions ?? JSON.parse(existing.decisions)),
        };
        this.db
            .prepare(
                `UPDATE meetings SET title=@title, tldr=@tldr, transcript=@transcript, decisions=@decisions WHERE id=@id`
            )
            .run({ id, ...merged });
        const updated = this.db
            .prepare(`SELECT * FROM meetings WHERE id = ?`)
            .get(id) as MeetingRow;
        return rowToMeeting(updated);
    }
}
