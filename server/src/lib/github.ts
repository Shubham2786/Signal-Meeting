import { appConfig } from "../config.js";
import { AppError } from "./errors.js";
import type { ActionItem } from "@signal/core";

export interface GithubIssueResult {
    url: string;
    number: number;
}

/**
 * Create a GitHub issue from an action item. Degrades gracefully: if no token
 * or repo is configured, throws a clear, non-leaking AppError the route turns
 * into a friendly message.
 */
export async function createGithubIssue(
    item: ActionItem
): Promise<GithubIssueResult> {
    if (!appConfig.github.enabled) {
        throw new AppError(
            "github_disabled",
            "GitHub is not configured. Set GITHUB_TOKEN and GITHUB_REPO to enable issue creation.",
            409
        );
    }

    const [owner, repo] = appConfig.github.repo.split("/");
    const bodyLines = [
        item.followUp ? `${item.followUp}\n` : "",
        `**Owner:** ${item.owner}`,
        item.dueDate ? `**Due:** ${item.dueDate}` : "",
        "",
        `> ${item.sourceQuote}`,
        "",
        "_Created by Signal Meetings._",
    ]
        .filter(Boolean)
        .join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
        const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/issues`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${appConfig.github.token}`,
                    Accept: "application/vnd.github+json",
                    "Content-Type": "application/json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                body: JSON.stringify({ title: item.title, body: bodyLines }),
                signal: controller.signal,
            }
        );
        if (!res.ok) {
            throw new AppError(
                "github_error",
                `GitHub responded with ${res.status}. Check your token scope and repo.`,
                502
            );
        }
        const json = (await res.json()) as { html_url: string; number: number };
        return { url: json.html_url, number: json.number };
    } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(
            "github_unreachable",
            "Could not reach GitHub. Try again later.",
            502
        );
    } finally {
        clearTimeout(timeout);
    }
}
