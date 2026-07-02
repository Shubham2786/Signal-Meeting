import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { appConfig } from "./config.js";
import { getContainer } from "./container.js";
import { AppError, toEnvelope } from "./lib/errors.js";
import { meetingRoutes } from "./routes/meetings.js";
import { actionItemRoutes } from "./routes/actionItems.js";
import { exportRoutes } from "./routes/export.js";

export async function buildApp(): Promise<FastifyInstance> {
    const app = Fastify({
        logger: {
            level: "info",
            // Redact anything that might carry secrets.
            redact: ["req.headers.authorization"],
        },
        bodyLimit: 2 * 1024 * 1024, // 2MB JSON cap; audio uses multipart limits below
    });

    await app.register(cors, { origin: true });
    await app.register(multipart, {
        limits: { fileSize: appConfig.maxAudioBytes, files: 1 },
    });

    // Tolerate empty JSON bodies (bodyless POSTs like /follow-up, /github-issue).
    app.addContentTypeParser(
        "application/json",
        { parseAs: "string" },
        (_req, body, done) => {
            const raw = typeof body === "string" ? body.trim() : "";
            if (raw.length === 0) return done(null, {});
            try {
                done(null, JSON.parse(raw));
            } catch {
                done(new AppError("invalid_json", "Malformed JSON body."), undefined);
            }
        }
    );

    // Uniform error envelope — never leak stack traces/secrets.
    app.setErrorHandler((err: unknown, _req, reply) => {
        const { status, body } = toEnvelope(err);
        if (status >= 500) {
            const message = err instanceof Error ? err.message : "unknown error";
            app.log.error({ code: body.error.code }, message);
        }
        reply.status(status).send(body);
    });

    app.setNotFoundHandler((_req, reply) => {
        reply.status(404).send({
            error: { code: "not_found", message: "Route not found." },
        });
    });

    const c = getContainer();

    app.get("/health", async () => ({
        status: "ok",
        aiMode: c.aiMode,
        dbMode: c.dbMode,
        githubEnabled: appConfig.github.enabled,
    }));

    await app.register(meetingRoutes);
    await app.register(actionItemRoutes);
    await app.register(exportRoutes);

    return app;
}
