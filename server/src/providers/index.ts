import type { AIProvider } from "@signal/core";
import { appConfig, type AiMode } from "../config.js";
import { StubAIProvider } from "./StubAIProvider.js";
import { GeminiProvider } from "./GeminiProvider.js";
import { GroqProvider } from "./GroqProvider.js";

/** Factory: choose the provider from config. Always safe — falls back to Stub. */
export function createAIProvider(): { provider: AIProvider; mode: AiMode } {
    if (appConfig.aiProvider === "groq" && appConfig.groq.hasRealKey) {
        return { provider: new GroqProvider(), mode: "groq" };
    }
    if (appConfig.aiProvider === "gemini" && appConfig.gemini.hasRealKey) {
        return { provider: new GeminiProvider(), mode: "gemini" };
    }
    return { provider: new StubAIProvider(), mode: "stub" };
}
