import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { runMigrations } from "../db/migrations.js";
import { SqliteMeetingRepository } from "./SqliteMeetingRepository.js";
import { SqliteActionItemRepository } from "./SqliteActionItemRepository.js";
import type { ActionItem, Meeting } from "@signal/core";

function freshRepos() {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
    return {
        meetings: new SqliteMeetingRepository(db),
        items: new SqliteActionItemRepository(db),
    };
}

const now = new Date().toISOString();

function makeMeeting(): Meeting {
    return {
        id: "mtg_1",
        title: "Test meeting",
        createdAt: now,
        transcript: "hello world",
        sourceType: "text",
        tldr: "summary",
        decisions: ["decided a thing"],
    };
}

function makeItem(over: Partial<ActionItem> = {}): ActionItem {
    return {
        id: "itm_1",
        meetingId: "mtg_1",
        title: "Do the thing",
        owner: "Ada",
        dueDate: "2026-07-01",
        followUp: null,
        sourceQuote: "Ada will do the thing",
        confidence: 0.9,
        status: "open",
        confirmed: false,
        duplicateOf: null,
        createdAt: now,
        updatedAt: now,
        ...over,
    };
}

test("meeting repository create + getById round-trips", async () => {
    const { meetings, items } = freshRepos();
    await meetings.create(makeMeeting());
    await items.createMany([makeItem()]);
    const fetched = await meetings.getById("mtg_1");
    assert.ok(fetched);
    assert.equal(fetched?.title, "Test meeting");
    assert.deepEqual(fetched?.decisions, ["decided a thing"]);
    assert.equal(fetched?.actionItems.length, 1);
});

test("action item update persists status + confirmed", async () => {
    const { meetings, items } = freshRepos();
    await meetings.create(makeMeeting());
    await items.createMany([makeItem()]);
    const updated = await items.update("itm_1", { status: "done", confirmed: true });
    assert.equal(updated?.status, "done");
    assert.equal(updated?.confirmed, true);
    const again = await items.getById("itm_1");
    assert.equal(again?.status, "done");
});

test("action item query filters by status and overdue", async () => {
    const { meetings, items } = freshRepos();
    await meetings.create(makeMeeting());
    await items.createMany([
        makeItem({ id: "itm_1", status: "open", dueDate: "2000-01-01" }),
        makeItem({ id: "itm_2", status: "done", dueDate: "2000-01-01" }),
    ]);
    const open = await items.query({ status: "open" });
    assert.equal(open.length, 1);
    const overdue = await items.query({ overdue: true });
    assert.equal(overdue.length, 1); // done items excluded from overdue
    assert.equal(overdue[0].id, "itm_1");
});
