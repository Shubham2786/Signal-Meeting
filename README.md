# Signal Meetings — AI Meeting-to-Execution Operator

Turn a meeting **transcript or audio file** into structured, owner-assigned,
deadline-tracked **action items** on a live execution board. This is an
**operator, not a chatbot** — it does the work (extracts, organizes, tracks,
drafts follow-ups) rather than answering questions.

The whole core loop runs **with no API key** on a deterministic Stub provider,
so the demo never fails.

```
Submit transcript / audio → AI extracts action items → human reviews & confirms
      → items land on the Execution Board → status tracked (Open → In Progress → Done)
```

## Quick start

```bash
npm install
npm run dev
```

- Web (Vite): http://localhost:5173
- API (Fastify): http://localhost:8080
- On first boot a realistic sample meeting is seeded, so the board is never empty.

`npm run dev` builds `@signal/core`, then runs the server and web together.
To run pieces separately: `npm run dev:server` and `npm run dev:web`.

### Build & test

```bash
npm run build   # builds core, server, and web
npm test        # core + server unit tests
```

## Going live with Gemini (a single config change)

The app runs in **Stub mode** by default. To use real Gemini:

1. Open `.env`.
2. Set `AI_PROVIDER=gemini`.
3. Paste your key into `GEMINI_API_KEY=` (replace `__REPLACE_ME__`).
4. Restart the server.

That's the only change. No domain or UI code edits — text generation already
goes through Gemini's OpenAI-compatible endpoint (mirroring Lemma's
`openai_compat` profile), and audio uses `@google/genai`, both behind the
`AIProvider` interface. If `AI_PROVIDER=gemini` but no real key is present, the
app safely falls back to Stub so it always boots.

GitHub issue creation (Tier 2) activates when `GITHUB_TOKEN` and `GITHUB_REPO`
are set; otherwise the button degrades gracefully with a clear message.

## 60-second demo script

1. **Board (hero).** App opens on the seeded "Q3 Launch Planning" board — items
   grouped Open / In Progress / Done, each with owner, due date, and a subtle
   confidence bar. Point out the per-meeting **progress chip**.
2. **New meeting.** Click **New meeting** → paste any transcript → **Extract
   action items**. (Or switch to **Upload audio** and drop a file — Stub returns
   a sample transcript so it's demoable offline.)
3. **Review.** High-confidence items are pre-confirmed (auto-triage); lower ones
   are flagged. Edit one inline, open a **source quote** to show traceability,
   then **Confirm all**.
4. **Track.** Back on the board, move an item Open → In Progress → Done (buttons
   or keyboard `1/2/3`, `j/k` to navigate). Watch the progress chip update.
5. **Operate.** Click **Follow-up** for an auto-drafted recap (copy to
   clipboard), then export the meeting as **Markdown** or **.ics**.
6. **Power.** Press **⌘K / Ctrl-K** for the command palette; toggle **dark/light**.

## Architecture

npm workspaces monorepo:

```
packages/core   Pure domain — types, AIProvider + repository interfaces,
                ExtractionService, FollowUpService, DuplicateDetector, export,
                natural-language date parsing. No Fastify/React. (Future Lemma pod.)
server          Fastify routes (thin) + Zod, SQLite repositories, migrations +
                seed, StubAIProvider + GeminiProvider, GitHub + error envelope.
web             React + Vite + Tailwind. Design tokens, UI primitives, and the
                submit / review / board / history features.
```

Portability (enforced): all AI calls live inside provider classes; domain code
depends only on `AIProvider`; all data access via repository interfaces; all
secrets/URLs/models from env. See `deploy/LEMMA_DEPLOYMENT.md`.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/meetings` | create + extract from pasted transcript |
| POST | `/meetings/transcribe-audio` | multipart audio → transcript → extraction |
| GET | `/meetings` | history list |
| GET | `/meetings/:id` | meeting + action items |
| GET | `/action-items` | filter / sort (owner, status, overdue, search) |
| PATCH | `/action-items/:id` | edit fields / status / confirm |
| POST | `/meetings/:id/follow-up` | draft recap |
| POST | `/action-items/:id/github-issue` | create issue (graceful if unconfigured) |
| GET | `/meetings/:id/export.md` | Markdown checklist |
| GET | `/meetings/:id/export.ics` | calendar of dated items |

Uniform error envelope: `{ "error": { "code", "message" } }`. No stack traces or
secrets are leaked.

## Feature coverage

- **Tier 0 (core):** text + audio intake, extraction, review/confirm, execution
  board, status persistence, source-quote traceability, Stub provider (no key).
- **Tier 1:** TL;DR + decisions, natural-language deadlines, follow-up draft,
  confidence auto-triage, search/filter/sort, meeting history, progress chip,
  autosaved transcript draft.
- **Tier 2:** one-click GitHub issue, command palette + shortcuts, undo on status
  change, light duplicate detection, Markdown + .ics export.

## Running with Docker

```bash
docker compose up --build
```

- Web: http://localhost:5173 (nginx serves the build and proxies the API)
- API: http://localhost:8080

Pass real keys via environment (e.g. `AI_PROVIDER=gemini GEMINI_API_KEY=… docker compose up`).

## Migration to Lemma

The proto is structured to port with minimal rewrite:

- **React app → Lemma TS frontend** (`lemma-sdk`).
- **`/packages/core` → Python pod function** (`lemma-sdk`), same orchestration.
- **`AIProvider` → `openai_compat` profile** — config swap, no code change.
- **Repositories → Lemma datastore**; **transcripts → document store**.

Full steps and the (intentionally unfabricated) pod manifest TODO are in
`deploy/LEMMA_DEPLOYMENT.md`, with `deploy/lemma-setup.sh` and
`deploy/config.toml.example`.

## Configuration

All config comes from environment variables — see `.env.example`. Key ones:
`AI_PROVIDER`, `GEMINI_API_KEY`, `PORT`, `DATABASE_URL`, `AUTO_CONFIRM_CONFIDENCE`,
`GITHUB_TOKEN`, `GITHUB_REPO`. `.env` is git-ignored; `.env.example` is committed.
Never commit real keys.
