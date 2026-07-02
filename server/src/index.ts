import { buildApp } from "./app.js";
import { appConfig } from "./config.js";
import { ensureSeed } from "./db/seed.js";
import { closeDb } from "./db/database.js";

async function main(): Promise<void> {
    // Seed a sample meeting on first boot so the board is never empty in a demo.
    // Don't let a DB/seed problem crash boot — log clearly and keep serving.
    try {
        await ensureSeed();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[seed] skipped: ${msg}`);
    }

    const app = await buildApp();
    try {
        await app.listen({ port: appConfig.port, host: "0.0.0.0" });
        app.log.info(
            `Signal Meetings server ready on :${appConfig.port} (AI mode: ${appConfig.aiProvider})`
        );
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }

    const shutdown = async () => {
        await app.close();
        closeDb();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main();
