import { getContainer } from "../container.js";
import { SEED_TITLE, SEED_TRANSCRIPT } from "./seedTranscript.js";
import { closeDb } from "./database.js";

/**
 * Seed one realistic meeting if the database is empty. Idempotent: a second
 * run is a no-op. Runs through the normal extraction path (Stub provider),
 * so the seeded board mirrors real usage.
 */
export async function ensureSeed(): Promise<void> {
    const c = getContainer();
    const existing = await c.meetings.list();
    if (existing.length > 0) return;
    await c.extraction.createFromTranscript({
        title: SEED_TITLE,
        transcript: SEED_TRANSCRIPT,
        sourceType: "text",
    });
}

// Allow `npm run seed` to run this file directly.
const isDirect =
    process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("db/seed.ts");
if (isDirect) {
    ensureSeed()
        .then(() => {
            // eslint-disable-next-line no-console
            console.log("Seed complete.");
            closeDb();
        })
        .catch((err) => {
            // eslint-disable-next-line no-console
            console.error("Seed failed:", err);
            process.exit(1);
        });
}
