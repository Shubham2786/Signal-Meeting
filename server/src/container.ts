import {
    ExtractionService,
    FollowUpService,
    type ActionItemRepository,
    type AIProvider,
    type MeetingRepository,
} from "@signal/core";
import { getDb } from "./db/database.js";
import { SqliteMeetingRepository } from "./repositories/SqliteMeetingRepository.js";
import { SqliteActionItemRepository } from "./repositories/SqliteActionItemRepository.js";
import { getSupabase } from "./repositories/supabase/client.js";
import { SupabaseMeetingRepository } from "./repositories/supabase/SupabaseMeetingRepository.js";
import { SupabaseActionItemRepository } from "./repositories/supabase/SupabaseActionItemRepository.js";
import { createAIProvider } from "./providers/index.js";
import { appConfig, type AiMode, type DbProvider } from "./config.js";

export interface Container {
    meetings: MeetingRepository;
    items: ActionItemRepository;
    ai: AIProvider;
    aiMode: AiMode;
    dbMode: DbProvider;
    extraction: ExtractionService;
    followUp: FollowUpService;
}

let instance: Container | null = null;

function buildRepos(): {
    meetings: MeetingRepository;
    items: ActionItemRepository;
} {
    if (appConfig.databaseProvider === "supabase") {
        const sb = getSupabase();
        return {
            meetings: new SupabaseMeetingRepository(sb),
            items: new SupabaseActionItemRepository(sb),
        };
    }
    const db = getDb();
    return {
        meetings: new SqliteMeetingRepository(db),
        items: new SqliteActionItemRepository(db),
    };
}

export function getContainer(): Container {
    if (instance) return instance;
    const { meetings, items } = buildRepos();
    const { provider, mode } = createAIProvider();
    const extraction = new ExtractionService(provider, meetings, items, {
        autoConfirmConfidence: appConfig.autoConfirmConfidence,
    });
    const followUp = new FollowUpService(provider);
    instance = {
        meetings,
        items,
        ai: provider,
        aiMode: mode,
        dbMode: appConfig.databaseProvider,
        extraction,
        followUp,
    };
    return instance;
}
