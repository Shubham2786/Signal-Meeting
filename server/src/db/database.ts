import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { appConfig } from "../config.js";
import { runMigrations } from "./migrations.js";

let db: Database.Database | null = null;

/** Lazily open (and migrate) the SQLite database. */
export function getDb(): Database.Database {
    if (db) return db;
    mkdirSync(dirname(appConfig.databaseFile), { recursive: true });
    db = new Database(appConfig.databaseFile);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
    return db;
}

export function closeDb(): void {
    if (db) {
        db.close();
        db = null;
    }
}
