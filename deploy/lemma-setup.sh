#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Configure a local Lemma stack to serve Signal Meetings' text
# generation through the Gemini OpenAI-compatible profile.
#
# Uses ONLY real, documented commands: `lemma-stack config set KEY VALUE`
# followed by `lemma-stack restart`. No invented deploy manifest.
#
# Prereq: the Lemma stack + CLI are installed (see LEMMA_DEPLOYMENT.md).
# Set GEMINI_API_KEY in your shell before running:
#   export GEMINI_API_KEY=your_key
# ─────────────────────────────────────────────────────────────
set -euo pipefail

: "${GEMINI_API_KEY:?Set GEMINI_API_KEY before running (export GEMINI_API_KEY=...)}"

echo "Configuring Lemma model profile (openai_compat → Gemini)…"

lemma-stack config set LEMMA_DEFAULT_MODEL_TYPE openai_compat
lemma-stack config set LEMMA_OPENAI_API_KEY "$GEMINI_API_KEY"
lemma-stack config set LEMMA_OPENAI_BASE_URL "https://generativelanguage.googleapis.com/v1beta/openai/"
lemma-stack config set LEMMA_OPENAI_DEFAULT_MODEL "gemini-2.5-flash"
lemma-stack config set LEMMA_OPENAI_MODEL_NAMES "gemini-2.5-flash,gemini-2.5-pro"
lemma-stack config set LEMMA_OPENAI_VISION_MODEL_NAMES "gemini-2.5-pro"

echo "Restarting the stack to apply configuration…"
lemma-stack restart

echo "Done. Stack endpoints (per Lemma docs):"
echo "  frontend: http://127-0-0-1.sslip.io:3711"
echo "  backend:  http://127-0-0-1.sslip.io:8711"
