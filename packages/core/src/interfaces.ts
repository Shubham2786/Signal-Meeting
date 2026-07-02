import type {
    ActionItem,
    ExtractionResult,
    Meeting,
    MeetingWithItems,
    Status,
} from "./types.js";

/**
 * AIProvider — the single seam for all AI work. Domain code depends ONLY on
 * this interface, never on a vendor SDK. Implementations: GeminiProvider,
 * StubAIProvider. Mirrors Lemma's model surface so migration is a config swap.
 */
export interface AIProvider {
    /** JSON-schema-constrained structured extraction from a transcript. */
    extract(input: ExtractInput): Promise<ExtractionResult>;
    /** Transcribe an uploaded audio file to text. */
    transcribeAudio(input: TranscribeInput): Promise<string>;
    /** Draft a follow-up recap (email/Slack) from confirmed items. */
    draftFollowUp(input: FollowUpInput): Promise<string>;
}

export interface ExtractInput {
    transcript: string;
    /** Meeting date used to resolve natural-language deadlines. ISO date. */
    meetingDate: string;
}

export interface TranscribeInput {
    bytes: Buffer;
    mimeType: string;
    fileName: string;
}

export interface FollowUpInput {
    meetingTitle: string;
    tldr: string;
    decisions: string[];
    items: Pick<ActionItem, "title" | "owner" | "dueDate">[];
}

/** Repository interfaces — SQLite impls live in /server. */
export interface MeetingRepository {
    create(meeting: Meeting): Promise<Meeting>;
    getById(id: string): Promise<MeetingWithItems | null>;
    list(): Promise<Meeting[]>;
    update(
        id: string,
        patch: Partial<Pick<Meeting, "title" | "tldr" | "decisions" | "transcript">>
    ): Promise<Meeting | null>;
}

export interface ActionItemQuery {
    meetingId?: string;
    owner?: string;
    status?: Status;
    overdue?: boolean;
    search?: string;
    sort?: "dueDate" | "confidence" | "createdAt";
    order?: "asc" | "desc";
}

export interface ActionItemRepository {
    createMany(items: ActionItem[]): Promise<ActionItem[]>;
    getById(id: string): Promise<ActionItem | null>;
    listByMeeting(meetingId: string): Promise<ActionItem[]>;
    query(q: ActionItemQuery): Promise<ActionItem[]>;
    update(id: string, patch: Partial<ActionItem>): Promise<ActionItem | null>;
}
