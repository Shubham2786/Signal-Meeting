import type {
    AIProvider,
    ActionItemRepository,
    MeetingRepository,
} from "../interfaces.js";
import type {
    ActionItem,
    Meeting,
    MeetingWithItems,
    SourceType,
} from "../types.js";
import { parseNaturalDate } from "../date.js";
import { newId } from "../id.js";
import { DuplicateDetector } from "./DuplicateDetector.js";

export interface ExtractionServiceConfig {
    /** Items with confidence >= this are auto-confirmed. */
    autoConfirmConfidence: number;
}

export interface CreateFromTranscriptInput {
    title?: string;
    transcript: string;
    sourceType?: SourceType;
    /** Defaults to now; used to resolve natural-language deadlines. */
    meetingDate?: Date;
}

/**
 * ExtractionService — the core orchestration. Injectable, vendor-free.
 * This is the future Lemma pod function. It:
 *   1. asks the AIProvider to extract structured data,
 *   2. normalizes deadlines to ISO,
 *   3. applies confidence-based auto-triage,
 *   4. flags duplicates,
 *   5. persists the meeting + items through repositories.
 */
export class ExtractionService {
    private readonly duplicates = new DuplicateDetector();

    constructor(
        private readonly ai: AIProvider,
        private readonly meetings: MeetingRepository,
        private readonly items: ActionItemRepository,
        private readonly config: ExtractionServiceConfig
    ) { }

    private deriveTitle(transcript: string, provided?: string): string {
        if (provided && provided.trim()) return provided.trim();
        const firstLine = transcript
            .split("\n")
            .map((l) => l.trim())
            .find((l) => l.length > 0);
        const base = firstLine ?? "Untitled meeting";
        return base.length > 80 ? `${base.slice(0, 77)}…` : base;
    }

    async createFromTranscript(
        input: CreateFromTranscriptInput
    ): Promise<MeetingWithItems> {
        const now = new Date();
        const meetingDate = input.meetingDate ?? now;
        const nowIso = now.toISOString();

        const extraction = await this.ai.extract({
            transcript: input.transcript,
            meetingDate: meetingDate.toISOString().slice(0, 10),
        });

        const meeting: Meeting = {
            id: newId("mtg"),
            title: this.deriveTitle(input.transcript, input.title),
            createdAt: nowIso,
            transcript: input.transcript,
            sourceType: input.sourceType ?? "text",
            tldr: extraction.tldr,
            decisions: extraction.decisions,
        };

        const actionItems: ActionItem[] = extraction.actionItems.map((raw) => {
            const dueDate = parseNaturalDate(raw.dueDate, meetingDate);
            const confidence = Math.max(0, Math.min(1, raw.confidence));
            return {
                id: newId("itm"),
                meetingId: meeting.id,
                title: raw.title.trim(),
                owner: raw.owner?.trim() || "Unassigned",
                dueDate,
                followUp: raw.followUp?.trim() || null,
                sourceQuote: raw.sourceQuote?.trim() || "",
                confidence,
                status: "open",
                // Auto-triage: high-confidence items are pre-confirmed for the reviewer.
                confirmed: confidence >= this.config.autoConfirmConfidence,
                duplicateOf: null,
                createdAt: nowIso,
                updatedAt: nowIso,
            };
        });

        // Duplicate flagging within this batch.
        const flags = this.duplicates.detect(actionItems);
        for (const item of actionItems) {
            const dup = flags.get(item.id);
            if (dup) item.duplicateOf = dup;
        }

        await this.meetings.create(meeting);
        await this.items.createMany(actionItems);

        return { ...meeting, actionItems };
    }
}
