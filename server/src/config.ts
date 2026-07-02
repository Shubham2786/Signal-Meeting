import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Load .env from repo root (server runs from /server).
loadEnv({ path: resolve(process.cwd(), "../.env") });
loadEnv(); // also allow a local ./.env override

function num(name: string, fallback: number): number {
    const v = process.env[name];
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : fallback;
}

function str(name: string, fallback = ""): string {
    return process.env[name]?.trim() || fallback;
}

function isReal(v: string): boolean {
    return v.length > 0 && v !== "__REPLACE_ME__";
}

export type AiMode = "stub" | "gemini" | "groq";
export type DbProvider = "sqlite" | "supabase";

// ---- AI keys ----
const geminiKey = str("GEMINI_API_KEY");
const hasGeminiKey = isReal(geminiKey);

// Groq supports one or two keys (failover / rate-limit rotation).
const groqKeys = [str("GROQ_API_KEY"), str("GROQ_API_KEY_2")].filter(isReal);
const hasGroqKey = groqKeys.length > 0;

const providerEnv = str("AI_PROVIDER", "stub").toLowerCase();

export interface AppConfig {
    port: number;
    databaseUrl: string;
    databaseFile: string;
    databaseProvider: DbProvider;
    aiProvider: AiMode;
    autoConfirmConfidence: number;
    gemini: {
        apiKey: string;
        baseUrl: string;
        textModel: string;
        audioModel: string;
        hasRealKey: boolean;
    };
    groq: {
        apiKeys: string[];
        baseUrl: string;
        textModel: string;
        audioModel: string;
        hasRealKey: boolean;
    };
    supabase: {
        url: string;
        serviceRoleKey: string;
        enabled: boolean;
    };
    github: { token: string; repo: string; enabled: boolean };
    maxTranscriptChars: number;
    maxAudioBytes: number;
}

/** Resolve the SQLite file path from a DATABASE_URL like file:./data/signal.db */
function resolveDbFile(url: string): string {
    const cleaned = url.replace(/^file:/, "");
    return resolve(process.cwd(), cleaned);
}

const databaseUrl = str("DATABASE_URL", "file:./data/signal.db");

// ---- Resolve AI provider with safe fallback to stub ----
let aiProvider: AiMode = "stub";
if (providerEnv === "gemini" && hasGeminiKey) aiProvider = "gemini";
else if (providerEnv === "groq" && hasGroqKey) aiProvider = "groq";
// If a real provider was requested but its key is missing, we stay on stub so
// the app always boots and demos never fail.

// ---- Resolve DB provider ----
const supabaseUrl = str("SUPABASE_URL");
const supabaseServiceKey = str("SUPABASE_SERVICE_ROLE_KEY");
const supabaseEnabled = isReal(supabaseUrl) && isReal(supabaseServiceKey);
const dbProviderEnv = str("DATABASE_PROVIDER", "sqlite").toLowerCase();
let databaseProvider: DbProvider =
    dbProviderEnv === "supabase" && supabaseEnabled ? "supabase" : "sqlite";

const githubToken = str("GITHUB_TOKEN");
const githubRepo = str("GITHUB_REPO");

export const appConfig: AppConfig = {
    port: num("PORT", 8080),
    databaseUrl,
    databaseFile: resolveDbFile(databaseUrl),
    databaseProvider,
    aiProvider,
    autoConfirmConfidence: num("AUTO_CONFIRM_CONFIDENCE", 0.8),
    gemini: {
        apiKey: geminiKey,
        baseUrl: str(
            "GEMINI_BASE_URL",
            "https://generativelanguage.googleapis.com/v1beta/openai/"
        ),
        textModel: str("GEMINI_TEXT_MODEL", "gemini-2.5-flash"),
        audioModel: str("GEMINI_AUDIO_MODEL", "gemini-2.5-pro"),
        hasRealKey: hasGeminiKey,
    },
    groq: {
        apiKeys: groqKeys,
        baseUrl: str("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
        textModel: str("GROQ_TEXT_MODEL", "llama-3.3-70b-versatile"),
        audioModel: str("GROQ_AUDIO_MODEL", "whisper-large-v3"),
        hasRealKey: hasGroqKey,
    },
    supabase: {
        url: supabaseUrl,
        serviceRoleKey: supabaseServiceKey,
        enabled: supabaseEnabled,
    },
    github: {
        token: githubToken,
        repo: githubRepo,
        enabled:
            isReal(githubToken) &&
            /.+\/.+/.test(githubRepo) &&
            githubRepo !== "owner/repo",
    },
    maxTranscriptChars: num("MAX_TRANSCRIPT_CHARS", 100_000),
    maxAudioBytes: num("MAX_AUDIO_BYTES", 25 * 1024 * 1024),
};
