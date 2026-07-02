import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { parseNaturalDate } from "@signal/core";
import { getContainer } from "../container.js";
import { AppError } from "../lib/errors.js";
import { createGithubIssue } from "../lib/github.js";

const querySchema = z.object({
    meetingId: z.string().optional(),
    owner: z.string().optional(),
    status: z.enum(["open", "in_progress", "done"]).optional(),
    overdue: z
        .union([z.literal("true"), z.literal("false")])
        .optional()
        .transform((v) => v === "true"),
    search: z.string().optional(),
    sort: z.enum(["dueDate", "confidence", "createdAt"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
});

const patchSchema = z.object({
    title: z.string().min(1).optional(),
    owner: z.string().optional(),
    dueDate: z.union([z.string(), z.null()]).optional(),
    followUp: z.union([z.string(), z.null()]).optional(),
    status: z.enum(["open", "in_progress", "done"]).optional(),
    confirmed: z.boolean().optional(),
});

export async function actionItemRoutes(app: FastifyInstance): Promise<void> {
    const c = getContainer();

    // GET /action-items — filter/sort
    app.get("/action-items", async (req) => {
        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            throw new AppError("invalid_query", parsed.error.issues[0]?.message ?? "Invalid query");
        }
        const items = await c.items.query(parsed.data);
        return { items };
    });

    // PATCH /action-items/:id — edit fields / status / confirm
    app.patch("/action-items/:id", async (req) => {
        const { id } = req.params as { id: string };
        const parsed = patchSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError("invalid_body", parsed.error.issues[0]?.message ?? "Invalid body");
        }
        const patch = { ...parsed.data };
        // Normalize natural-language dates on edit.
        if (typeof patch.dueDate === "string") {
            patch.dueDate = parseNaturalDate(patch.dueDate) ?? patch.dueDate;
        }
        const updated = await c.items.update(id, patch);
        if (!updated) throw new AppError("not_found", "Action item not found.", 404);
        return updated;
    });

    // POST /action-items/:id/github-issue — graceful if no token
    app.post("/action-items/:id/github-issue", async (req) => {
        const { id } = req.params as { id: string };
        const item = await c.items.getById(id);
        if (!item) throw new AppError("not_found", "Action item not found.", 404);
        const issue = await createGithubIssue(item);
        return { issue };
    });
}
