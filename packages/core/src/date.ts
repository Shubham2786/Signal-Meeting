/**
 * Lightweight natural-language deadline parser. Resolves phrases like
 * "next Friday", "tomorrow", "in 3 days", "end of month" relative to a
 * reference date. Returns an ISO date string (YYYY-MM-DD) or null.
 *
 * Deliberately dependency-free and deterministic so it works identically in
 * the Stub provider and as a normalizer for real model output.
 */

const WEEKDAYS: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};

function toISO(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
    const copy = new Date(d);
    copy.setUTCDate(copy.getUTCDate() + n);
    return copy;
}

/** Returns true if the value already looks like an ISO date. */
export function isIsoDate(v: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
}

export function parseNaturalDate(
    input: string | null | undefined,
    reference: Date = new Date()
): string | null {
    if (!input) return null;
    const raw = input.trim().toLowerCase();
    if (raw.length === 0 || raw === "null" || raw === "none") return null;

    // Already ISO (with or without time component).
    if (isIsoDate(raw)) return raw;
    const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})[t ]/);
    if (isoMatch) return isoMatch[1];

    const ref = new Date(
        Date.UTC(
            reference.getUTCFullYear(),
            reference.getUTCMonth(),
            reference.getUTCDate()
        )
    );

    if (raw === "today") return toISO(ref);
    if (raw === "tomorrow") return toISO(addDays(ref, 1));
    if (raw === "yesterday") return toISO(addDays(ref, -1));

    // "in N day(s)/week(s)"
    const inMatch = raw.match(/^in\s+(\d+)\s+(day|days|week|weeks)$/);
    if (inMatch) {
        const n = parseInt(inMatch[1], 10);
        const mult = inMatch[2].startsWith("week") ? 7 : 1;
        return toISO(addDays(ref, n * mult));
    }

    // "end of week" / "end of month"
    if (raw === "end of week" || raw === "eow") {
        const delta = (5 - ref.getUTCDay() + 7) % 7; // upcoming Friday
        return toISO(addDays(ref, delta));
    }
    if (raw === "end of month" || raw === "eom") {
        const end = new Date(
            Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0)
        );
        return toISO(end);
    }

    // "next <weekday>" / "this <weekday>" / bare "<weekday>"
    const wdMatch = raw.match(/^(next|this)?\s*([a-z]+)$/);
    if (wdMatch) {
        const target = WEEKDAYS[wdMatch[2]];
        if (target !== undefined) {
            const cur = ref.getUTCDay();
            let delta = (target - cur + 7) % 7;
            if (delta === 0) delta = 7; // always future
            if (wdMatch[1] === "next") delta += delta <= 7 ? 0 : 0; // "next" ~ upcoming
            return toISO(addDays(ref, delta));
        }
    }

    // Fallback: let Date try. If it parses, normalize; else null.
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) return toISO(parsed);

    return null;
}

/** True if an ISO date is strictly before today (UTC). */
export function isOverdue(
    dueDate: string | null,
    reference: Date = new Date()
): boolean {
    if (!dueDate) return false;
    const due = new Date(`${dueDate}T00:00:00.000Z`);
    if (isNaN(due.getTime())) return false;
    const ref = new Date(
        Date.UTC(
            reference.getUTCFullYear(),
            reference.getUTCMonth(),
            reference.getUTCDate()
        )
    );
    return due.getTime() < ref.getTime();
}
