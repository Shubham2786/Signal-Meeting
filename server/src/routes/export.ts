import type { FastifyInstance } from "fastify";
import { toICS, toMarkdown } from "@signal/core";
import { getContainer } from "../container.js";
import { AppError } from "../lib/errors.js";

export async function exportRoutes(app: FastifyInstance): Promise<void> {
    const c = getContainer();

    // GET /meetings/:id/export.md
    app.get("/meetings/:id/export.md", async (req, reply) => {
        const { id } = req.params as { id: string };
        const meeting = await c.meetings.getById(id);
        if (!meeting) throw new AppError("not_found", "Meeting not found.", 404);
        const md = toMarkdown(meeting, meeting.actionItems);
        reply
            .header("Content-Type", "text/markdown; charset=utf-8")
            .header(
                "Content-Disposition",
                `attachment; filename="${sanitize(meeting.title)}.md"`
            );
        return md;
    });

    // GET /meetings/:id/export.ics
    app.get("/meetings/:id/export.ics", async (req, reply) => {
        const { id } = req.params as { id: string };
        const meeting = await c.meetings.getById(id);
        if (!meeting) throw new AppError("not_found", "Meeting not found.", 404);
        const ics = toICS(meeting, meeting.actionItems);
        reply
            .header("Content-Type", "text/calendar; charset=utf-8")
            .header(
                "Content-Disposition",
                `attachment; filename="${sanitize(meeting.title)}.ics"`
            );
        return ics;
    });
}

function sanitize(name: string): string {
    return name.replace(/[^a-z0-9-_ ]/gi, "").trim().slice(0, 60) || "meeting";
}
