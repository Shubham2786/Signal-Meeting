/** Date + text formatting helpers. Dates render with tabular numerals. */

export function formatDate(iso: string | null): string {
    if (!iso) return "No date";
    const d = new Date(`${iso}T00:00:00`);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year:
            d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    });
}

export function formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export function isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    const due = new Date(`${dueDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
}

export function relativeDue(dueDate: string | null): string {
    if (!dueDate) return "";
    const due = new Date(`${dueDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round(
        (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 0) return "today";
    if (diff === 1) return "tomorrow";
    if (diff === -1) return "yesterday";
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    return `in ${diff}d`;
}

export function confidencePct(c: number): number {
    return Math.round(c * 100);
}

export function initials(name: string): string {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
