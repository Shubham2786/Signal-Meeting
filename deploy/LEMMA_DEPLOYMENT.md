# Deploying Signal Meetings to Lemma

This guide is written against the actual `lemma-platform` source (cloned locally at
`../lemma-platform`, git-ignored). It replaces the earlier placeholder: the pod +
app model below is verified against Lemma's own builder docs
(`lemma-skills/lemma-builder/references/*`).

## What Lemma actually is (and what it isn't)

Lemma is **not** a generic host you push a Fastify server + Supabase to. It's a
workspace platform built around a **pod** — one team's operating system holding:

- **Tables** — the datastore (typed columns, row-level security). *This replaces Supabase.*
- **Files** — document store with built-in RAG.
- **Functions** — deterministic **Python** entrypoints (`Pod.from_env()`). *This is where our server logic goes.*
- **Agents** — LLM workers that return structured JSON. *This is our extraction step.*
- **Workflows / Schedules / Connectors / Surfaces** — orchestration + integrations.
- **Apps** — the browser UI, deployed into the pod, built on `lemma-sdk`. *This is our React frontend, re-backed onto the SDK.*

So porting Signal Meetings is a **re-platform**, not a lift-and-shift. The good news:
our architecture already isolates the seams (AIProvider, repository interfaces, a
typed API client), so the mapping is clean.

## Mapping: Signal Meetings → Lemma pod

| Today (prototype) | Lemma target |
| --- | --- |
| Supabase `meetings` / `action_items` tables | Pod **tables** `meetings`, `action_items` (`enable_rls: false` — shared team data) |
| `GroqProvider` / `GeminiProvider` (extraction) | Pod **agent** `extractor` with an `output_schema` = the extraction contract, running on the pod's model profile (Groq via `openai_compat`) |
| `ExtractionService` (call model → normalize dates → dedupe → write rows) | Pod **function** `submit_transcript` (Python): calls the agent, normalizes deadlines, flags duplicates, writes rows |
| `FollowUpService` | Pod **function** `draft_follow_up` (or a direct agent call) |
| Markdown / `.ics` export | Pod **functions** `export_markdown` / `export_ics` |
| Fastify routes | Not needed — the app calls tables/functions/agents directly via `lemma-sdk` |
| React + Vite web app | Pod **app** (Vite + React + `lemma-sdk`), reusing our components/design |
| `parseNaturalDate`, `DuplicateDetector` (TS) | Re-implemented in the Python function (small, pure logic) |

The domain contract (`{ tldr, decisions[], actionItems[{title,owner,dueDate,followUp,sourceQuote,confidence}] }`)
becomes the agent's `output_schema` verbatim.

## Step 1 — Install and start the Lemma stack

Windows (Docker Desktop running):

```powershell
iwr https://raw.githubusercontent.com/lemma-work/lemma-platform/main/install.ps1 | iex
```

This installs `uv`, installs `lemma-stack`, and brings up the stack:

- App: `http://127-0-0-1.sslip.io:3711`
- API: `http://127-0-0-1.sslip.io:8711` (docs at `/scalar`)

Always use the `127-0-0-1.sslip.io` host — sign-in cookies are scoped to it;
`localhost` won't authenticate.

## Step 2 — Configure the model profile (Groq via openai_compat)

Groq is OpenAI-compatible, so point the profile at Groq's endpoint:

```powershell
lemma-stack config set LEMMA_DEFAULT_MODEL_TYPE openai_compat
lemma-stack config set LEMMA_OPENAI_API_KEY <your_groq_key>
lemma-stack config set LEMMA_OPENAI_BASE_URL https://api.groq.com/openai/v1
lemma-stack config set LEMMA_OPENAI_DEFAULT_MODEL llama-3.3-70b-versatile
lemma-stack config set LEMMA_OPENAI_MODEL_NAMES llama-3.3-70b-versatile
# optional: a Fernet key for secrets at rest (recommended for real data)
lemma-stack config set SECRET_ENCRYPTION_KEY <fernet-key>
lemma-stack restart
```

(Leave `LEMMA_OPENAI_VISION_MODEL_NAMES` empty — the Groq text model isn't multimodal.
Audio transcription would use a separate Groq Whisper call inside a function, not the
system model profile.)

## Step 3 — Install the CLI + SDKs

```powershell
uv tool install lemma-terminal
lemma servers select local
lemma auth login

npm install lemma-sdk        # for the app frontend
uv pip install lemma-sdk     # for local function testing
```

## Step 4 — Create the pod and author the bundle

```powershell
lemma orgs list                       # note your org id
lemma pods create signal-meetings --org <org> --description "AI meeting-to-execution operator"
lemma pod init signal-meetings        # scaffolds pod.json + starter; edit from here
cd signal-meetings
```

Author these resources (folder name must equal each resource `name`):

- `tables/meetings/meetings.json` — shared table:
  columns `title TEXT`, `transcript TEXT`, `source_type ENUM(text,audio)`, `tldr TEXT`, `decisions JSON`.
- `tables/action_items/action_items.json` — shared table:
  `meeting_id UUID`, `title TEXT`, `owner TEXT`, `due_date DATE`, `follow_up TEXT`,
  `source_quote TEXT`, `confidence FLOAT`, `status ENUM(open,in_progress,done)`,
  `confirmed BOOLEAN`, `duplicate_of TEXT`.
  (`id`, `created_at`, `updated_at` are auto — never declare them.)
- `agents/extractor/extractor.json` + `instruction.md` — the extraction prompt, with an
  `output_schema` mirroring the domain contract. Grant it nothing (it only reasons).
- `functions/submit_transcript/` (`submit_transcript.json` + `code.py`) — the pipeline:
  create the meeting row, call the `extractor` agent, normalize deadlines, flag
  duplicates, bulk-write `action_items`. Grant it `meetings:read,write`,
  `action_items:read,write`, and `agent_extractor` (read+execute).
- `functions/draft_follow_up/`, `functions/export_markdown/`, `functions/export_ics/` — grant `action_items:read`, `meetings:read`.
- `apps/board/` — the Vite React app (Step 6).

Scaffold each with `lemma tables|agents|functions|apps init <name>`, edit, then:

```powershell
lemma pods import . --dry-run     # validate
lemma pods import .               # upsert
lemma pods doctor signal-meetings # check grants/targets wiring
```

## Step 5 — Test the backend layer, then seed

```powershell
lemma functions run submit_transcript --data '{"transcript":"Priya: Arjun will finish billing by next Friday."}'
lemma records list action_items --limit 5     # confirm rows landed
```

Seed demo data (records don't travel in bundles — use a script):

```powershell
lemma records import meetings ./seed/meetings.jsonl
lemma records import action_items ./seed/action_items.jsonl
```

(You can reuse the Indian-name sample content from `deploy/supabase-seed.sql`, reshaped to JSONL.)

## Step 6 — Build and deploy the app

```powershell
lemma apps init ./board --pod signal-meetings --title "Execution Board" --nav sidebar --style soft
cd board
npm run dev            # auto-authenticated dev server
```

Rebuild the UI on `lemma-sdk` hooks instead of our Fastify client:

- `useLiveRecords("action_items")` → the board (live via the table WebSocket — no polling).
- `useRecords("meetings")` → history/dashboard.
- `useUpdateRecord("action_items")` → drag-and-drop status changes, edits, confirm.
- `useFunctionRun("submit_transcript")` → the Submit screen.
- `useFunctionRun("draft_follow_up")` → the follow-up modal.
- Wrap the app in `AuthGuard` from `lemma-sdk/react`.

Our existing components (Board, DnD, tooltips, tokens, Linear styling) port over —
only the **data layer** (`web/src/lib/api.ts` + hooks) swaps to the SDK. Then:

```powershell
lemma apps deploy board --yes    # builds dist/ and serves it in the pod
lemma apps open board            # open the deployed app
```

## Step 7 — Verify

```powershell
lemma pods describe                       # full inventory
lemma functions permissions get submit_transcript   # grants present
lemma apps get board                      # deployed release id
```

Walk the core loop in the deployed app: submit transcript → review → board → status change persists.

## Effort & tradeoffs (be realistic)

- **Biggest change:** the frontend data layer (`api.ts` → `lemma-sdk` hooks) and the
  server pipeline (`ExtractionService` TS → `submit_transcript` Python). The domain
  contract and UI are reusable.
- **Supabase and the Fastify server are not deployed to Lemma** — pod tables +
  functions replace them. Keep the standalone prototype (Groq + Supabase + Fastify)
  for local/offline demos; the Lemma pod is the platform-native deployment.
- **Audio**: transcription stays a Groq Whisper call inside the `submit_transcript`
  function (Lemma's model profile handles text; audio is a direct provider call).
- **Auth** becomes real (pod-authenticated) instead of the prototype's open API — a net gain.

## Reference (in the cloned repo)

- `lemma-platform/lemma-skills/lemma-builder/references/pod-model.md` — the canonical model.
- `.../references/apps.md` + `.../app-recipes/*` — app build + SDK hooks + recipes.
- `.../references/functions.md` — the Python function contract (`Pod.from_env()`).
- `.../references/tables.md`, `agents.md`, `cli-and-bundles.md`.
- `lemma-platform/docs/installation.md` — stack install + model config.
