# Signal Meetings — AI Meeting-to-Execution Operator

Turn a meeting **transcript** into structured, owner-assigned, deadline-tracked
**action items** on a live execution board. This is an **operator, not a chatbot** —
it does the work (extracts, organizes, tracks, drafts follow-ups) rather than
answering questions.

```
Submit transcript → AI extracts action items → human reviews & confirms
    → items land on the Execution Board → status tracked (Open → In Progress → Done)
```

Signal Meetings is built and deployed as a native **Lemma pod**. The extraction,
data, orchestration, and UI all live inside Lemma's primitives — this repo is the
authored pod bundle plus a standalone version for offline development.

---

## Built on Lemma

[Lemma](https://lemma.work) is a **pod platform**: one workspace that holds a team's
data, automation, and UI under a single permission boundary. Signal Meetings maps
cleanly onto its primitives — it is *not* a server + database we host ourselves, and
*not* a chatbot wrapped around an LLM. Each piece of the product is a Lemma resource:

| Signal Meetings piece | Lemma primitive | In the bundle |
| --- | --- | --- |
| Meeting + action-item data | **Tables** (shared, typed) | `deploy/lemma-pod/tables/` |
| Turning a transcript into structured items | **Agent** with an `output_schema` | `deploy/lemma-pod/agents/extractor/` |
| Recap-email drafting | **Agent** | `deploy/lemma-pod/agents/follow_up_writer/` |
| Extract → normalize dates → dedupe → auto-confirm → write rows | **Function** (Python) | `deploy/lemma-pod/functions/submit_transcript/` |
| Follow-up, Markdown export, .ics export | **Functions** (Python) | `deploy/lemma-pod/functions/` |
| The Execution Board UI | **App** (on `lemma-sdk`) | `deploy/lemma-pod/apps/board/` |

The extraction runs as a **pod agent on the pod's own model profile** — the model is
platform configuration, not something the code calls directly. So the same pod runs
against a self-hosted local stack or the hosted cloud with **zero code changes**; only
the model profile differs (and the cloud even provides a default model, so no setup at
all).

### Deploy it to Lemma

The whole pod is one authored bundle at **`deploy/lemma-pod/`**, imported with the
`lemma` CLI. Minimal flow:

```bash
lemma servers select default          # cloud (lemma.work) — or `local` for a self-hosted stack
lemma auth login                       # browser sign-in
lemma orgs list                        # note your org id
lemma pods create signal-meetings --org <org>
lemma pods import ./deploy/lemma-pod --pod signal-meetings --dry-run
lemma pods import ./deploy/lemma-pod --pod signal-meetings
lemma functions run submit_transcript --pod signal-meetings \
  --file ./deploy/lemma-pod/seed/meeting_product.input.json     # extract + seed the board
lemma apps deploy board ./deploy/lemma-pod/apps/board/index.html --pod signal-meetings --yes
lemma apps open board --pod signal-meetings
```

- **Full step-by-step (install → auth → model → import → seed → app → verify), with
  every gotcha:** `deploy/LEMMA_CLI_DEPLOY_GUIDE.md`.
- **Design/mapping rationale and the pod runbook:** `deploy/lemma-pod/README.md` and
  `deploy/LEMMA_DEPLOYMENT.md`.

Because Lemma pods are **zero-access-by-default**, every function and agent declares
exactly the tables/agents it may touch in `permissions.grants` — the grants travel in
the bundle and are the source of truth for what each workload can do.

---

## Standalone version (local / offline development)

The repo also contains a self-contained TypeScript app — useful for developing the
domain logic offline and for a demo that runs with **no API key at all** (a
deterministic Stub provider). This is the *development* form of the same domain that
the Lemma pod deploys.

```bash
npm install
npm run dev          # web (Vite) http://localhost:5173 · API (Fastify) http://localhost:8080
```

A realistic sample meeting is seeded on first boot, so the board is never empty.
`npm run build` builds everything; `npm test` runs the unit tests.

### AI provider is pluggable (a config change, never code)

All model access is confined behind one `AIProvider` interface, so the provider is an
env switch — this is the same seam that lets the domain move onto a Lemma agent:

- `stub` — deterministic, **no key**; the whole loop runs offline.
- `groq` / `gemini` — real extraction via an OpenAI-compatible endpoint (mirrors
  Lemma's `openai_compat` model profile) + audio transcription.

Set `AI_PROVIDER` and the matching key in `.env` (see `.env.example`), then restart.
If a provider is selected but no key is present, the app falls back to Stub so it
always boots. GitHub-issue creation activates only when `GITHUB_TOKEN` + `GITHUB_REPO`
are set, and degrades gracefully otherwise. Data provider is `DATABASE_PROVIDER`
(`sqlite` local, or `supabase`).

### Standalone architecture

npm workspaces monorepo, structured so the domain ports to Lemma with minimal rewrite:

```
packages/core   Pure domain — types, AIProvider + repository interfaces,
                ExtractionService, FollowUpService, DuplicateDetector, export,
                natural-language date parsing. No Fastify/React.
                → this logic is what deploy/lemma-pod/functions/*/code.py re-implements.
server          Fastify routes (thin) + Zod, SQLite/Supabase repositories, migrations +
                seed, Stub/Groq/Gemini providers, uniform error envelope.
web             React + Vite + Tailwind. Design tokens, UI primitives, and the
                submit / review / board / dashboard / history features.
```

---

## 60-second demo (either the Lemma board app or the standalone web app)

1. **Board (hero).** Opens on the seeded board — items grouped Open / In Progress /
   Done, each with owner, due date, and a confidence bar.
2. **New meeting.** Paste a transcript → **Extract action items**. The extractor
   agent (Lemma) / provider (standalone) returns a TL;DR, decisions, and owner-assigned
   items with source quotes.
3. **Review.** High-confidence items are pre-confirmed (auto-triage); open a **source
   quote** to show traceability.
4. **Track.** Move an item Open → In Progress → Done; the board persists it.
5. **Operate.** Draft an auto-generated **follow-up** recap, then export the meeting as
   **Markdown** or **.ics**.

---

## Feature coverage

- **Tier 0 (core):** transcript intake, extraction, review/confirm, execution board,
  status persistence, source-quote traceability.
- **Tier 1:** TL;DR + decisions, natural-language deadlines, follow-up draft,
  confidence auto-triage, search/filter/sort, meeting history, progress chip.
- **Tier 2:** command palette + shortcuts, undo on status change, light duplicate
  detection, Markdown + .ics export. (GitHub issues + audio intake exist in the
  standalone app; see `HANDOFF` for their status on the Lemma port.)

## Configuration

All config comes from environment variables — see `.env.example`. `.env` is
git-ignored; never commit real keys. For the Lemma pod, secrets/model live in the
**pod's model profile** (platform config), not in the repo.
