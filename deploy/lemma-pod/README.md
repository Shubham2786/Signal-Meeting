# Signal Meetings — Lemma Pod Bundle

This directory is the Lemma-native deployment of Signal Meetings: a pod that holds
the data (tables), the extraction judgment (agents), the orchestration
(functions), and the operator UI (app). It is a re-platform of the standalone
prototype — Supabase + Fastify are replaced by pod tables + functions; the
`AIProvider` extraction step becomes a pod agent on the pod's model profile.

Deployed pod: **signal-meetings** (`019f2075-51e6-7234-a6bc-905348fc2fe6`)
Org: Shubhamsarwar7482426's Space (`019f2065-6ab7-7290-87b9-321e79e3c2fe`)
App URL (local stack): **http://board.127-0-0-1.sslip.io:8711**

## Contents

```
pod.json
tables/
  meetings/meetings.json            shared: title, transcript, source_type, tldr, decisions
  action_items/action_items.json   shared: meeting_id(FK), title, owner, due_date, follow_up,
                                    source_quote, confidence, status, confirmed, duplicate_of
agents/
  extractor/                        transcript -> {tldr, decisions[], actionItems[]} (output_schema)
  follow_up_writer/                 brief -> recap email draft (plain text)
functions/
  submit_transcript/                run extractor -> normalize dates -> flag dupes -> auto-confirm -> write rows
  draft_follow_up/                  gather confirmed items -> run follow_up_writer
  export_markdown/                  render a meeting as a Markdown checklist
  export_ics/                       render dated items as an iCalendar (.ics)
apps/
  board/                            no-build HTML operator UI (index.html / html.html)
seed/                               demo transcripts (run through submit_transcript)
payloads/                           test fixtures (ignored by import)
```

### Mapping from the prototype

| Prototype (`/packages/core`, `/server`) | Lemma target |
| --- | --- |
| Supabase tables | pod tables `meetings`, `action_items` (`enable_rls: false`) |
| `GroqProvider.extract` | agent `extractor` (`output_schema` = extraction contract) on the pod model profile |
| `ExtractionService` | function `submit_transcript` (calls the agent, then the ported date/dedupe logic) |
| `parseNaturalDate` (`date.ts`) | `parse_natural_date` in `submit_transcript/code.py` |
| `DuplicateDetector` (Jaccard) | `_similarity` in `submit_transcript/code.py` |
| `FollowUpService` | function `draft_follow_up` + agent `follow_up_writer` |
| `toMarkdown` / `toICS` (`export.ts`) | functions `export_markdown` / `export_ics` |
| React/Vite web app | pod app `board` (SDK over tables + functions) |

## Prerequisites

- Stack up: `lemma-stack status` (all services running).
- Model profile set to Groq (`openai_compat`) — see `../LEMMA_DEPLOYMENT.md`.
- Authenticated: `lemma auth status`.

### Windows note (important)

On Windows + Docker Desktop the agentbox sandbox (needed to create/run functions
and agents) fails to bind-mount the workspace because the platform passes a
`C:\...` host path into the Linux agentbox container, where `.resolve()` mangles
it. Fix applied to this stack:

```powershell
lemma-stack config set agentbox.env.AGENTBOX_STORAGE_HOST_ROOT=/run/desktop/mnt/host/c/Users/HP/.lemma/local/data/workspaces
lemma-stack restart
```

`/run/desktop/mnt/host/c/...` is where Docker Desktop exposes the Windows C: drive
to its daemon VM, so bind mounts from inside agentbox resolve correctly.

## Build / import / verify

```powershell
lemma pods create signal-meetings --org <org> --description "AI meeting-to-execution operator"
lemma pods import ./deploy/lemma-pod --pod signal-meetings --dry-run
lemma pods import ./deploy/lemma-pod --pod signal-meetings
lemma pods doctor signal-meetings

# core loop (extraction + persistence)
lemma functions run submit_transcript --pod signal-meetings --file ./deploy/lemma-pod/payloads/submit_transcript.input.json
lemma query run "select status, count(*) from action_items group by status" --pod signal-meetings

# other functions (fill in a real meeting_id)
lemma functions run export_markdown --pod signal-meetings --file ./deploy/lemma-pod/payloads/meeting_id.input.json
lemma functions run export_ics      --pod signal-meetings --file ./deploy/lemma-pod/payloads/meeting_id.input.json
lemma functions run draft_follow_up --pod signal-meetings --file ./deploy/lemma-pod/payloads/meeting_id.input.json
```

## Seed demo data

Records don't travel in bundles. Seed by running the real pipeline on the sample
transcripts (produces properly linked, extracted rows with Indian-name demo data):

```powershell
lemma functions run submit_transcript --pod signal-meetings --file ./deploy/lemma-pod/seed/meeting_product.input.json
lemma functions run submit_transcript --pod signal-meetings --file ./deploy/lemma-pod/seed/meeting_eng.input.json
```

## App

The board is a **no-build HTML app** (`apps/board/index.html`): it loads the
host-served SDK, authenticates the signed-in pod user, and drives everything
through `client.records` + `client.functions`. Redeploy after edits:

```powershell
lemma apps deploy board ./deploy/lemma-pod/apps/board/index.html --pod signal-meetings --yes
lemma apps open board
```

Board features: Execution Board (Open / In Progress / Done with keyboard-friendly
status moves), New Meeting (submit transcript → live extraction), Meetings & Export
(follow-up draft + Markdown/.ics download), a completion progress stat, light/dark
theme, and source-quote traceability on every card.

## Notes / TODO-verify

- Functions call the agent via `pod.agents.run` + poll the conversation for the
  structured `output` (COMPLETED). This keeps extraction on the pod model profile
  so migration between environments stays a config swap.
- Agents rely on the backend default runtime (`system:lemma`) — no pinned runtime
  profile. Fine for the Groq `openai_compat` profile.
- The bundle does not fabricate a "pod deploy yml" — the deploy unit is this pod
  imported via `lemma pods import`, per the Lemma docs.
