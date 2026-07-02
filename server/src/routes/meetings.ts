import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getContainer } from "../container.js";
import { appConfig } from "../config.js";
import { AppError } from "../lib/errors.js";

const createBody = z.object({
    transcript: z.string().min(1, "transcript is required"),
    title: z.string().max(200).optional(),
});

export async function meetingRoutes(app: FastifyInstance): Promise<void> {
    const c = getContainer();

    // POST /meetings — create + extract from pasted transcript
    app.post("/meetings", async (req) => {
        const parsed = createBody.safeParse(req.body);
        if (!parsed.success) {
            throw new AppError("invalid_body", parsed.error.issues[0]?.message ?? "Invalid body");
        }
        const { transcript, title } = parsed.data;
        if (transcript.length > appConfig.maxTranscriptChars) {
            throw new AppError(
                "transcript_too_long",
                `Transcript exceeds the ${appConfig.maxTranscriptChars} character limit.`,
                413
            );
        }
        const result = await c.extraction.createFromTranscript({
            transcript,
            title,
            sourceType: "text",
        });
        return result;
    });

    // POST /meetings/:id/transcribe-audio — multipart audio → transcript → extraction
    app.post("/meetings/transcribe-audio", async (req) => {
        const file = await req.file();
        if (!file) throw new AppError("no_file", "No audio file provided.");
        const audioExt = /\.(mp3|wav|m4a|aac|ogg|flac|webm|mp4|mpeg|mpga)$/i;
        const mimeOk =
            /^audio\//.test(file.mimetype) ||
            /^video\//.test(file.mimetype) ||
            (file.mimetype === "application/octet-stream" &&
                audioExt.test(file.filename ?? ""));
        if (!mimeOk) {
            throw new AppError("bad_mime", "Uploaded file must be audio.");
        }
        const bytes = await file.toBuffer();
        if (bytes.byteLength > appConfig.maxAudioBytes) {
            throw new AppError("audio_too_large", "Audio file is too large.", 413);
        }
        const transcript = await c.ai.transcribeAudio({
            bytes,
            mimeType: file.mimetype,
            fileName: file.filename,
        });
        const result = await c.extraction.createFromTranscript({
            transcript,
            title: file.filename?.replace(/\.[^.]+$/, "") || undefined,
            sourceType: "audio",
        });
        return result;
    });

    // GET /meetings — history list
    app.get("/meetings", async () => {
        const meetings = await c.meetings.list();
        return { meetings };
    });

    // GET /meetings/:id — meeting + items
    app.get("/meetings/:id", async (req) => {
        const { id } = req.params as { id: string };
        const meeting = await c.meetings.getById(id);
        if (!meeting) throw new AppError("not_found", "Meeting not found.", 404);
        return meeting;
    });

    // POST /meetings/:id/follow-up — draft recap
    app.post("/meetings/:id/follow-up", async (req) => {
        const { id } = req.params as { id: string };
        const meeting = await c.meetings.getById(id);
        if (!meeting) throw new AppError("not_found", "Meeting not found.", 404);
        const draft = await c.followUp.draft(meeting, meeting.actionItems);
        return { draft };
    });
}
