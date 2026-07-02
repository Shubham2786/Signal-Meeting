import type { ActionItem } from "../types.js";

/**
 * Light duplicate detection. Flags near-identical action items using a
 * normalized token Jaccard similarity over titles. Deterministic, no deps.
 */
export class DuplicateDetector {
    constructor(private readonly threshold = 0.8) { }

    private tokenize(s: string): Set<string> {
        return new Set(
            s
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, " ")
                .split(/\s+/)
                .filter((t) => t.length > 2)
        );
    }

    similarity(a: string, b: string): number {
        const ta = this.tokenize(a);
        const tb = this.tokenize(b);
        if (ta.size === 0 || tb.size === 0) return 0;
        let inter = 0;
        for (const t of ta) if (tb.has(t)) inter++;
        const union = ta.size + tb.size - inter;
        return union === 0 ? 0 : inter / union;
    }

    /**
     * Returns a map of itemId -> id of an earlier item it likely duplicates.
     * Compares against previously-seen items (existing + earlier in list).
     */
    detect(candidates: ActionItem[], existing: ActionItem[] = []): Map<string, string> {
        const flags = new Map<string, string>();
        const seen = [...existing];
        for (const item of candidates) {
            for (const prior of seen) {
                if (prior.id === item.id) continue;
                if (this.similarity(item.title, prior.title) >= this.threshold) {
                    flags.set(item.id, prior.id);
                    break;
                }
            }
            seen.push(item);
        }
        return flags;
    }
}
