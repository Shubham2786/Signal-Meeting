import { z } from "zod";

/**
 * The AI extraction contract. The extraction call MUST return JSON that
 * satisfies this schema. Validated with Zod; on failure the provider retries
 * once with a repair instruction, then fails cleanly.
 */
export const extractedActionItemSchema = z.object({
    title: z.string().min(1, "title is required"),
    owner: z.string().min(1).default("Unassigned"),
    dueDate: z
        .union([z.string(), z.null()])
        .transform((v) => (v && v.trim().length > 0 ? v : null))
        .default(null),
    followUp: z.union([z.string(), z.null()]).default(null),
    sourceQuote: z.string().default(""),
    confidence: z.coerce.number().min(0).max(1).default(0.5),
});

export const extractionResultSchema = z.object({
    tldr: z.string().default(""),
    decisions: z.array(z.string()).default([]),
    actionItems: z.array(extractedActionItemSchema).default([]),
});

export type ExtractionResultParsed = z.infer<typeof extractionResultSchema>;

/**
 * The JSON schema handed to the model (OpenAI-compatible json_schema mode).
 * Kept in sync with the Zod schema above by hand — both describe the contract.
 */
export const extractionJsonSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        tldr: { type: "string", description: "<= 3 sentence summary" },
        decisions: {
            type: "array",
            items: { type: "string" },
            description: "Key decisions made in the meeting",
        },
        actionItems: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    title: { type: "string", description: "Imperative task title" },
                    owner: {
                        type: "string",
                        description: "Person name or 'Unassigned'",
                    },
                    dueDate: {
                        type: ["string", "null"],
                        description: "ISO 8601 date (YYYY-MM-DD) or null",
                    },
                    followUp: {
                        type: ["string", "null"],
                        description: "Suggested next step or null",
                    },
                    sourceQuote: {
                        type: "string",
                        description: "Verbatim transcript snippet justifying the item",
                    },
                    confidence: {
                        type: "number",
                        description: "0.0..1.0 confidence",
                    },
                },
                required: [
                    "title",
                    "owner",
                    "dueDate",
                    "followUp",
                    "sourceQuote",
                    "confidence",
                ],
            },
        },
    },
    required: ["tldr", "decisions", "actionItems"],
} as const;
