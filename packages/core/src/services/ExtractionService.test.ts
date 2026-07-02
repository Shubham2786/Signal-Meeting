import { test } from "node:test";
import assert from "node:assert/strict";
import { ExtractionService } from "./ExtractionService.js";
import { parseNaturalDate, isOverdue } from "../date.js";
import { DuplicateDetector } from "./DuplicateDetector.js";
import type {
    AIProvider,
    ActionItemRepository,
    MeetingRepository,
} from "../interfaces.js";
import type {
    ActionItem,
    ExtractionResult,
    Meeting,
    MeetingWithItems,
} from "../types.js";

// ---- In-memory repositories for testing ----
class MemMeetingRepo implements MeetingRepository {
    store = new Map<string, Meeting>();
    itemsRef: MemItemRepo | null = null;
    async create(m: Meeting) {
        this.store.set(m.id, m);
        return m;
    }
    async getById(id: string): Promise<MeetingWithItems | null> {
        const m = this.store.get(id);
        if (!m) return null;
        const actionItems = this.itemsRef
            ? await this.itemsRef.listByMeeting(id)
            : [];
        return { ...m, actionItems };
    }
    async list() {
        return [...this.store.values()];
    }
    async update() {
        return null;
    }
}
class MemItemRepo implements ActionItemRepository {
    store = new Map<string, ActionItem>();
    async createMany(items: ActionItem[]) {
        for (const i of items) this.store.set(i.id, i);
        return items;
    }
    async getById(id: string) {
        return this.store.get(id) ?? null;
    }
    async listByMeeting(meetingId: string) {
        return [...this.store.values()].filter((i) => i.meetingId === meetingId);
    }
    async query() {
        return [...this.store.values()];
    }
    async update(id: string, patch: Partial<ActionItem>) {
        const cur = this.store.get(id);
        if (!cur) return null;
        const next = { ...cur, ...patch };
        this.store.set(id, next);
        return next;
    }
}

class FakeProvider implements AIProvider {
    async extract(): Promise<ExtractionResult> {
        return {
            tldr: "Short summary.",
            decisions: ["Ship on Friday"],
            actionItems: [
                {
                    title: "Write the launch email",
                    owner: "Ada",
                    dueDate: "tomorrow",
                    followUp: "Send to marketing",
                    sourceQuote: "Ada will write the launch email by tomorrow.",
                    confidence: 0.95,
                },
                {
                    title: "Draft launch email", // near-duplicate title
                    owner: "Ada",
                    dueDate: null,
                    followUp: null,
                    sourceQuote: "we need a launch email",
                    confidence: 0.4,
                },
            ],
        };
    }
    async transcribeAudio() {
        return "transcript";
    }
    async draftFollowUp() {
        return "draft";
    }
}

test("parseNaturalDate resolves relative phrases", () => {
    const ref = new Date("2026-06-30T00:00:00Z"); // Tuesday
    assert.equal(parseNaturalDate("today", ref), "2026-06-30");
    assert.equal(parseNaturalDate("tomorrow", ref), "2026-07-01");
    assert.equal(parseNaturalDate("in 3 days", ref), "2026-07-03");
    assert.equal(parseNaturalDate("2026-08-15", ref), "2026-08-15");
    assert.equal(parseNaturalDate(null, ref), null);
    assert.equal(parseNaturalDate("gibberish nonsense", ref), null);
});

test("isOverdue compares against reference date", () => {
    const ref = new Date("2026-06-30T00:00:00Z");
    assert.equal(isOverdue("2026-06-29", ref), true);
    assert.equal(isOverdue("2026-06-30", ref), false);
    assert.equal(isOverdue("2026-07-01", ref), false);
    assert.equal(isOverdue(null, ref), false);
});

test("DuplicateDetector flags near-identical titles", () => {
    const d = new DuplicateDetector(0.5);
    assert.ok(d.similarity("Write launch email", "Draft launch email") >= 0.3);
});

test("ExtractionService persists meeting + auto-triages by confidence", async () => {
    const mRepo = new MemMeetingRepo();
    const iRepo = new MemItemRepo();
    mRepo.itemsRef = iRepo;
    const svc = new ExtractionService(new FakeProvider(), mRepo, iRepo, {
        autoConfirmConfidence: 0.8,
    });
    const result = await svc.createFromTranscript({
        transcript: "Team sync\nAda will write the launch email by tomorrow.",
        meetingDate: new Date("2026-06-30T00:00:00Z"),
    });

    assert.equal(result.actionItems.length, 2);
    const high = result.actionItems[0];
    assert.equal(high.confirmed, true, "high-confidence item auto-confirmed");
    assert.equal(high.dueDate, "2026-07-01", "natural date resolved");
    const low = result.actionItems[1];
    assert.equal(low.confirmed, false, "low-confidence flagged for review");

    const stored = await mRepo.getById(result.id);
    assert.ok(stored, "meeting persisted");
    assert.equal(stored?.actionItems.length, 2);
});
