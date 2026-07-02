import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appConfig } from "../../config.js";
import { AppError } from "../../lib/errors.js";

let client: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the SERVICE ROLE key. This bypasses RLS
 * and must NEVER be exposed to the browser. Domain code never sees this — it
 * only lives behind the repository implementations.
 */
export function getSupabase(): SupabaseClient {
    if (client) return client;
    if (!appConfig.supabase.enabled) {
        throw new Error(
            "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        );
    }
    client = createClient(appConfig.supabase.url, appConfig.supabase.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return client;
}

/**
 * Turn a Supabase/PostgREST error into a clear AppError. Surfaces the real
 * cause (e.g. missing table) without leaking secrets. A missing-table error
 * (PGRST205) means the schema hasn't been applied — see deploy/supabase-schema.sql.
 */
export function dbError(error: { code?: string; message?: string }, action: string): AppError {
    const hint =
        error?.code === "PGRST205"
            ? " — run deploy/supabase-schema.sql in the Supabase SQL editor to create the tables."
            : "";
    return new AppError(
        "db_error",
        `${action}: ${error?.message ?? "unknown database error"}${hint}`,
        502
    );
}
