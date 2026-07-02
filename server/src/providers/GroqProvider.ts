import OpenAI, { toFile } from "openai";
import {
    extractionResultSchema,
    type AIProvider,
    type ExtractInput,
    type ExtractionResult,
    type FollowUpInput,
    type TranscribeInput,
} from "@signal/core";
import { appConfig } from "../config.js";

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * GroqProvider — real AI via Groq's OpenAI-compatible endpoint (same `openai`
 * client, different baseURL → mirrors the openai_compat profile, so migration
 * stays a config swap). Text uses chat completions with JSON-object mode +
 * Zod validation + a repair retry. Audio uses Groq's Whisper transcription.
 *
 * Supports 1–2 API keys with automatic failover on auth/rate-limit errors.
 * All vendor calls are confined to this class.
 */
export class GroqProvider implements AIProvider {
    private readonly clients: OpenAI[];

    constructor() {
        const { baseUrl, apiKeys } = appConfig.groq;
        this.clients = apiKeys.map(
            (apiKey) =>
                new OpenAI({
                    apiKey,
                    baseURL: baseUrl,
                    timeout: REQUEST_TIMEOUT_MS,
                    maxRetries: 2,
                })
        );
    }

    /** Run an operation against each key until one succeeds. */
    private async withFailover<T>(op: (client: OpenAI) => Promise<T>): Promise<T> {
        let lastErr: unknown;
        for (const client of this.clients) {
            try {
                return await op(client);
            } catch (err) {
                lastErr = err;
                const status = (err as { status?: number })?.status;
                // Only fail over on auth (401/403) or rate-limit (429) errors.
                if (status !== 401 && status !== 403 && status !== 429) throw err;
            }
        }
        throw lastErr ?? new Error("All Groq keys failed.");
    }

    async extract(input: ExtractInput): Promise<ExtractionResult> {
        const system = [
            "You convert meeting transcripts into structured execution data.",
            "Return ONLY a JSON object with keys: tldr (<=3 sentences), decisions (string[]),",
            "and actionItems (array). Each action item has: title (imperative),",
            "owner (person name or 'Unassigned'),",
            `dueDate (ISO 8601 YYYY-MM-DD resolved relative to the meeting date ${input.meetingDate}, or null),`,
            "followUp (next step or null), sourceQuote (verbatim transcript snippet),",
            "confidence (0.0-1.0 number). No prose outside the JSON.",
        ].join(" ");

        const first = await this.chatJson(system, input.transcript);
        const parsed = extractionResultSchema.safeParse(first);
        if (parsed.success) return parsed.data;

        const repair = await this.chatJson(
            system,
            input.transcript,
            `Your previous output failed validation: ${parsed.error.message}. Return corrected JSON only.`
        );
        const reparsed = extractionResultSchema.safeParse(repair);
        if (reparsed.success) return reparsed.data;

        throw new Error("Groq extraction failed schema validation after repair retry.");
    }

    private async chatJson(
        system: string,
        transcript: string,
        repairNote?: string
    ): Promise<unknown> {
        const completion = await this.withFailover((client) =>
            client.chat.completions.create({
                model: appConfig.groq.textModel,
                temperature: 0.2,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: system },
                    {
                        role: "user",
                        content: `${repairNote ? repairNote + "\n\n" : ""}Transcript:\n"""\n${transcript}\n"""`,
                    },
                ],
            })
        );
        return safeJson(completion.choices[0]?.message?.content ?? "{}");
    }

    async transcribeAudio(input: TranscribeInput): Promise<string> {
        const file = await toFile(input.bytes, input.fileName || "audio", {
            type: input.mimeType,
        });
        const res = await this.withFailover((client) =>
            client.audio.transcriptions.create({
                file,
                model: appConfig.groq.audioModel,
                response_format: "text",
            })
        );
        const text = typeof res === "string" ? res : (res as { text?: string }).text ?? "";
        if (!text.trim()) throw new Error("Audio transcription returned empty text.");
        return text;
    }

    async draftFollowUp(input: FollowUpInput): Promise<string> {
        const itemLines = input.items
            .map(
                (i) =>
                    `- ${i.title} (owner: ${i.owner}${i.dueDate ? `, due ${i.dueDate}` : ""})`
            )
            .join("\n");
        const prompt = [
            `Write a concise, friendly recap email for the meeting "${input.meetingTitle}".`,
            `TL;DR: ${input.tldr}`,
            input.decisions.length
                ? `Decisions:\n${input.decisions.map((d) => `- ${d}`).join("\n")}`
                : "",
            `Action items:\n${itemLines}`,
            "Keep it under 200 words. Start with a Subject line. Output plain text only.",
        ]
            .filter(Boolean)
            .join("\n\n");

        const completion = await this.withFailover((client) =>
            client.chat.completions.create({
                model: appConfig.groq.textModel,
                messages: [{ role: "user", content: prompt }],
            })
        );
        return completion.choices[0]?.message?.content?.trim() ?? "";
    }
}

function safeJson(content: string): unknown {
    try {
        return JSON.parse(content);
    } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch {
                /* fall through */
            }
        }
        return {};
    }
}
