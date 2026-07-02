import type { AIProvider } from "../interfaces.js";
import type { ActionItem, Meeting } from "../types.js";

/**
 * FollowUpService — produces a recap draft (email/Slack) from a meeting and
 * its confirmed action items via the AIProvider.
 */
export class FollowUpService {
    constructor(private readonly ai: AIProvider) { }

    async draft(meeting: Meeting, items: ActionItem[]): Promise<string> {
        const relevant = items.filter((i) => i.confirmed || i.status !== "open");
        return this.ai.draftFollowUp({
            meetingTitle: meeting.title,
            tldr: meeting.tldr,
            decisions: meeting.decisions,
            items: (relevant.length ? relevant : items).map((i) => ({
                title: i.title,
                owner: i.owner,
                dueDate: i.dueDate,
            })),
        });
    }
}
