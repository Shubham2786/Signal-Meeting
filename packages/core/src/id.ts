import { randomUUID } from "node:crypto";

/** Prefixed, sortable-enough id. Prefix aids debugging in logs/DB. */
export function newId(prefix: string): string {
    return `${prefix}_${randomUUID()}`;
}
