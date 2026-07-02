import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import {
    extractionJsonSchema,
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
 * GeminiProvider — real AI. Text/structured extraction goes through Gemini's
 * OpenAI-compatible endpoint via the `openai` client (mirrors Lemma's
 * openai_compat profile → migration = config swap). Audio uses native
 * @google/genai. All vendor calls are confined to this class.
 */
export class GeminiProvider implements AIProvider {
    private readonly openai: OpenAI;
    private readonly genai: GoogleGenAI;

    constructor() {
        const { apiKey, baseUrl } = appConfig.gemini;
        this.openai = new OpenAI({
            apiKey,
            baseURL: baseUrl,
            timeout: REQUEST_TIMEOUT_MS,
            maxRetries: 2,
        });
        this.genai = new GoogleGenAI({ apiKey });
    }

    async extract(input: ExtractInput): Promise<ExtractionResult> {
        const system = [
            "You are an operator that converts meeting transcripts into structured execution data.",
            "Extract a concise TL;DR (<= 3 sentences), key decisions, and imperative action items.",
            "For each action item include: title, owner (person name or 'Unassigned'), dueDate",
            `(ISO 8601 YYYY-MM-DD resolved relative to the meeting date ${input.meetingDate}, or null),`,
            "followUp (suggested next step or null), sourceQuote (verbatim snippet from the transcript),",
            "and confidence (0.0-1.0). Respond with JSON only, matching the provided schema.",
        ].join(" ");

        const first = await this.callStructured(system, input.transcript);
        const parsed = extractionResultSchema.safeParse(first);
        if (parsed.success) return parsed.data;

        // Repair retry: ask the model to fix the JSON to match the schema.
        const repair = await this.callStructured(
            system,
            input.transcript,
            `Your previous output failed schema validation: ${parsed.error.message}. Return corrected JSON only.`
        );
        const reparsed = extractionResultSchema.safeParse(repair);
        if (reparsed.success) return reparsed.data;

        throw new Error("Extraction failed schema validation after repair retry.");
    }

    private async callStructured(
        system: string,
        transcript: string,
        repairNote?: string
    ): Promise<unknown> {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: system },
            {
                role: "user",
                content: `${repairNote ? repairNote + "\n\n" : ""}Transcript:\n"""\n${transcript}\n"""`,
            },
        ];

        const completion = await this.openai.chat.completions.create({
            model: appConfig.gemini.textModel,
            messages,
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "extraction_result",
                    strict: true,
                    schema: extractionJsonSchema as unknown as Record<string, unknown>,
                },
            },
        });

        const content = completion.choices[0]?.message?.content ?? "{}";
        return safeJson(content);
    }

    async transcribeAudio(input: TranscribeInput): Promise<string> {
        const base64 = input.bytes.toString("base64");
        const response = await this.genai.models.generateContent({
            model: appConfig.gemini.audioModel,
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: "Transcribe this meeting audio verbatim. Include speaker labels if discernible. Output plain text only.",
                        },
                        { inlineData: { mimeType: input.mimeType, data: base64 } },
                    ],
                },
            ],
        });
        const text = response.text ?? "";
        if (!text.trim()) throw new Error("Audio transcription returned empty text.");
        return text;
    }

    async draftFollowUp(input: FollowUpInput): Promise<string> {
        const itemLines = input.items
            .map(
                (i) => `- ${i.title} (owner: ${i.owner}${i.dueDate ? `, due ${i.dueDate}` : ""})`
            )
            .join("\n");
        const prompt = [
            `Write a concise, friendly recap email for the meeting "${input.meetingTitle}".`,
            `TL;DR: ${input.tldr}`,
            input.decisions.length ? `Decisions:\n${input.decisions.map((d) => `- ${d}`).join("\n")}` : "",
            `Action items:\n${itemLines}`,
            "Keep it under 200 words. Start with a Subject line. Output plain text only.",
        ]
            .filter(Boolean)
            .join("\n\n");

        const completion = await this.openai.chat.completions.create({
            model: appConfig.gemini.textModel,
            messages: [{ role: "user", content: prompt }],
        });
        return completion.choices[0]?.message?.content?.trim() ?? "";
    }
}

function safeJson(content: string): unknown {
    try {
        return JSON.parse(content);
    } catch {
        // Attempt to extract the first JSON object from a fenced/decorated response.
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
