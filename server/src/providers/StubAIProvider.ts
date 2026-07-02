import type {
    AIProvider,
    ExtractInput,
    ExtractionResult,
    FollowUpInput,
    TranscribeInput,
} from "@signal/core";
import { SEED_TRANSCRIPT } from "../db/seedTranscript.js";

/**
 * StubAIProvider — deterministic, no API key required. Guarantees the whole
 * core loop and demos run offline. For the seed transcript it returns a
 * hand-authored high-quality extraction; for arbitrary transcripts it applies
 * a deterministic heuristic so pasted text still yields structured items.
 */
export class StubAIProvider implements AIProvider {
    async extract(input: ExtractInput): Promise<ExtractionResult> {
        const normalized = input.transcript.trim();
        if (this.looksLikeSeed(normalized)) {
            return this.seedExtraction();
        }
        return this.heuristicExtraction(normalized);
    }

    async transcribeAudio(_input: TranscribeInput): Promise<string> {
        // Deterministic stand-in transcript so the audio path is demoable with no key.
        return SEED_TRANSCRIPT;
    }

    async draftFollowUp(input: FollowUpInput): Promise<string> {
        const lines: string[] = [];
        lines.push(`Subject: Recap & action items — ${input.meetingTitle}`);
        lines.push("");
        lines.push("Hi team,");
        lines.push("");
        if (input.tldr) lines.push(input.tldr);
        lines.push("");
        if (input.decisions.length) {
            lines.push("Decisions:");
            for (const d of input.decisions) lines.push(`  • ${d}`);
            lines.push("");
        }
        lines.push("Action items:");
        for (const i of input.items) {
            const due = i.dueDate ? ` (due ${i.dueDate})` : "";
            lines.push(`  • ${i.title} — ${i.owner}${due}`);
        }
        lines.push("");
        lines.push("Reply here if anything looks off. Thanks!");
        return lines.join("\n");
    }

    // ---- internals ----

    private looksLikeSeed(t: string): boolean {
        return t.includes("Q3 Launch Planning") || t === SEED_TRANSCRIPT.trim();
    }

    private seedExtraction(): ExtractionResult {
        return {
            tldr:
                "The team locked the analytics dashboard launch: beta on the 15th, GA two weeks later if metrics hold. Billing, design empty states, pricing copy, and an accessibility audit are the gating work items.",
            decisions: [
                "Launch to the beta cohort on the 15th; GA two weeks later if metrics hold.",
                "Pricing stays at three tiers — no free tier for now.",
                "If the billing webhook is unstable, delay GA (not beta).",
            ],
            actionItems: [
                {
                    title: "Finish the billing integration for paid plans",
                    owner: "Arjun",
                    dueDate: "next Friday",
                    followUp: "Resolve the outstanding webhook edge case before GA.",
                    sourceQuote:
                        "I'll finish the billing integration by next Friday so paid plans work at launch.",
                    confidence: 0.93,
                },
                {
                    title: "Deliver the dashboard empty-state screens",
                    owner: "Ananya",
                    dueDate: "tomorrow",
                    followUp: "Hand off to engineering to unblock implementation.",
                    sourceQuote:
                        "I'll deliver the empty-state screens for the dashboard by tomorrow so engineering isn't blocked.",
                    confidence: 0.9,
                },
                {
                    title: "Update the pricing page copy for the three tiers",
                    owner: "Rohit",
                    dueDate: "Thursday",
                    followUp: "Reflect the three new tiers accurately.",
                    sourceQuote: "I'll have the pricing page copy ready by Thursday.",
                    confidence: 0.86,
                },
                {
                    title: "Run an accessibility audit on the new dashboard",
                    owner: "Ananya",
                    dueDate: "end of month",
                    followUp: "Complete before GA.",
                    sourceQuote: "I'll complete the accessibility audit by end of month.",
                    confidence: 0.78,
                },
                {
                    title: "Draft the customer launch announcement email",
                    owner: "Priya",
                    dueDate: "next Monday",
                    followUp: "Send to marketing for review.",
                    sourceQuote:
                        "I'll write the launch announcement draft myself and send it to marketing for review next Monday.",
                    confidence: 0.7,
                },
            ],
        };
    }

    /**
     * Deterministic heuristic extraction for arbitrary transcripts:
     * pick sentences that express commitments/tasks and shape them into items.
     */
    private heuristicExtraction(transcript: string): ExtractionResult {
        const sentences = transcript
            .split(/(?<=[.!?])\s+|\n+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        const actionVerbs = /\b(will|need to|should|must|let's|going to|i'll|we'll|please|assign|own|follow up|send|prepare|update|review|finish|complete|draft|deliver|schedule|create|fix|ship)\b/i;
        const decisionCue = /\b(decision|decided|agreed|we will|we'll go with|conclusion)\b/i;

        const decisions: string[] = [];
        const actionItems: ExtractionResult["actionItems"] = [];

        for (const s of sentences) {
            if (decisionCue.test(s) && decisions.length < 4) {
                decisions.push(s.replace(/^decision:\s*/i, "").trim());
                continue;
            }
            if (actionVerbs.test(s) && actionItems.length < 12) {
                const owner = this.guessOwner(s);
                const dueDate = this.guessDue(s);
                actionItems.push({
                    title: this.toTitle(s),
                    owner,
                    dueDate,
                    followUp: null,
                    sourceQuote: s,
                    confidence: this.scoreConfidence(s, owner, dueDate),
                });
            }
        }

        const tldr =
            sentences.slice(0, 2).join(" ").slice(0, 280) ||
            "Meeting transcript processed. Review the extracted action items below.";

        return { tldr, decisions, actionItems };
    }

    private guessOwner(s: string): string {
        // "Name will ..." or "Name:" prefix.
        const prefix = s.match(/^([A-Z][a-z]+):/);
        if (prefix) return prefix[1];
        const named = s.match(/\b([A-Z][a-z]+)\s+(?:will|to|should|is going to)\b/);
        if (named) return named[1];
        if (/\bi'll\b|\bi will\b/i.test(s)) return "Unassigned";
        return "Unassigned";
    }

    private guessDue(s: string): string | null {
        const m = s.match(
            /\b(today|tomorrow|next (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|end of (?:week|month)|in \d+ (?:days?|weeks?))\b/i
        );
        return m ? m[1].toLowerCase() : null;
    }

    private toTitle(s: string): string {
        // Strip leading "Name:" and normalize to an imperative-ish phrase.
        let t = s.replace(/^[A-Z][a-z]+:\s*/, "").trim();
        t = t.replace(/^(i'll|i will|we'll|we will|please)\s+/i, "");
        t = t.charAt(0).toUpperCase() + t.slice(1);
        return t.length > 100 ? `${t.slice(0, 97)}…` : t;
    }

    private scoreConfidence(s: string, owner: string, due: string | null): number {
        let c = 0.55;
        if (owner !== "Unassigned") c += 0.2;
        if (due) c += 0.15;
        if (/\bwill\b|\bi'll\b/i.test(s)) c += 0.05;
        return Math.min(0.95, Number(c.toFixed(2)));
    }
}
