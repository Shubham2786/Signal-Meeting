import type { ActionItem, Meeting } from "./types.js";

/** Render a meeting's action items as a Markdown checklist. */
export function toMarkdown(meeting: Meeting, items: ActionItem[]): string {
    const lines: string[] = [];
    lines.push(`# ${meeting.title}`);
    lines.push("");
    if (meeting.tldr) {
        lines.push(`**TL;DR:** ${meeting.tldr}`);
        lines.push("");
    }
    if (meeting.decisions.length) {
        lines.push("## Decisions");
        for (const d of meeting.decisions) lines.push(`- ${d}`);
        lines.push("");
    }
    lines.push("## Action items");
    if (items.length === 0) {
        lines.push("_No action items._");
    } else {
        for (const i of items) {
            const check = i.status === "done" ? "x" : " ";
            const due = i.dueDate ? ` _(due ${i.dueDate})_` : "";
            const owner = i.owner && i.owner !== "Unassigned" ? ` — **${i.owner}**` : "";
            lines.push(`- [${check}] ${i.title}${owner}${due}`);
        }
    }
    lines.push("");
    return lines.join("\n");
}

function icsEscape(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsDate(iso: string): string {
    // All-day event date value: YYYYMMDD
    return iso.replace(/-/g, "");
}

/** Render items that have deadlines as an iCalendar (.ics) VEVENT list. */
export function toICS(meeting: Meeting, items: ActionItem[]): string {
    const dated = items.filter((i) => i.dueDate);
    const now = new Date();
    const stamp =
        now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "").slice(0, 15) +
        "Z";
    const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Signal Meetings//Execution Operator//EN",
        "CALSCALE:GREGORIAN",
    ];
    for (const i of dated) {
        const due = i.dueDate as string;
        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${i.id}@signal-meetings`);
        lines.push(`DTSTAMP:${stamp}`);
        lines.push(`DTSTART;VALUE=DATE:${icsDate(due)}`);
        lines.push(`SUMMARY:${icsEscape(i.title)}`);
        lines.push(
            `DESCRIPTION:${icsEscape(
                `Owner: ${i.owner}. From meeting: ${meeting.title}.` +
                (i.followUp ? ` Next: ${i.followUp}` : "")
            )}`
        );
        lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    // iCalendar requires CRLF line endings.
    return lines.join("\r\n") + "\r\n";
}
