# Deploying to Lemma via the CLI — a shareable, step-by-step guide

A practical, from-zero walkthrough for deploying a Lemma **pod** (tables + agents +
functions + an app) with the `lemma` CLI. Written from a real deployment on both a
local self-hosted stack and the hosted cloud (`lemma.work`), including the Windows
gotchas that cost time. Share this with anyone doing their first Lemma deploy.

> Mental model: a **pod** is one team's workspace = **tables** (data) + **agents**
> (LLM judgment) + **functions** (deterministic Python) + **apps** (browser UI). You
> author it as a local **bundle** folder, then `lemma pods import` it (upsert by name).

---

## 0. Two very different targets — pick one

| | **Local stack** (self-hosted) | **Cloud** (`lemma.work`) |
|---|---|---|
| Runs on | your machine (Docker) | Lemma's infra |
| Cost | free (electricity/RAM) | depends on your plan — check Billing |
| Model | you configure (e.g. Groq) | built-in default model, no setup |
| CLI server name | `local` | `default` (api.lemma.work) |
| App URL shape | `http://<slug>.127-0-0-1.sslip.io:8711` | `https://<slug>.apps.lemma.work` |

The **bundle is identical** for both — only the server, org, and model setup differ.
Switch targets anytime with `lemma servers select local|default`.

---

## 1. Install the toolchain

**Local stack (only if self-hosting):**
```powershell
# Windows (Docker Desktop with WSL2 backend must be running)
iwr https://raw.githubusercontent.com/lemma-work/lemma-platform/main/install.ps1 | iex
```
```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/lemma-work/lemma-platform/main/install.sh | bash
```
This installs `uv`, installs `lemma-stack`, and brings the stack up. Verify:
```powershell
lemma-stack status        # all services running/healthy?
```
App: `http://127-0-0-1.sslip.io:3711` · API: `:8711` (docs at `/scalar`).
**Always use the `127-0-0-1.sslip.io` host — NOT `localhost`** (sign-in cookies are
scoped to it).

**The `lemma` CLI (needed for both local and cloud):**
```powershell
uv tool install lemma-terminal
```
> Windows 260-char path gotcha: installing from a deep git path can fail. If it does,
> `git config --global core.longpaths true`, or install from a local clone subdir.
> The tools land in `~/.local/bin` — if not on PATH, call them by full path, e.g.
> `& "$env:USERPROFILE\.local\bin\lemma.exe" ...`.

---

## 2. Point the CLI at a server + log in

```powershell
lemma servers list                 # see local + default(cloud)
lemma servers select default       # cloud   (or: select local)
lemma auth login                   # BROWSER OAuth — opens a browser, sign in there
lemma auth status                  # confirm you're authenticated
lemma orgs list                    # note your ORG ID (you'll pass it to pod create)
```
`lemma auth login` is browser-based — it can't be scripted; a human completes it.
Each server has its own login and its own orgs/pods (local and cloud don't share data).

---

## 3. Configure a model (LOCAL ONLY)

The cloud has a built-in default model — skip this. For a **local** stack, point the
model profile at any OpenAI-compatible provider (Groq shown):
```powershell
lemma-stack config set LEMMA_DEFAULT_MODEL_TYPE openai_compat
lemma-stack config set LEMMA_OPENAI_API_KEY <your_key>
lemma-stack config set LEMMA_OPENAI_BASE_URL https://api.groq.com/openai/v1
lemma-stack config set LEMMA_OPENAI_DEFAULT_MODEL llama-3.3-70b-versatile
lemma-stack config set LEMMA_OPENAI_MODEL_NAMES llama-3.3-70b-versatile
lemma-stack restart                # required to apply config changes
```
`config set` writes to `~/.lemma/local/config.toml`. Bare `KEY VALUE` goes to
`backend.env`; a dotted key targets a service section (e.g.
`lemma-stack config set agentbox.env.SOME_KEY value`).

---

## 4. Author the bundle (or reuse an existing one)

Bundle layout — **folder name MUST equal each resource's `name`**:
```
my-pod/
  pod.json                                   # {"name","description","format_version":1}
  tables/<name>/<name>.json                  # columns; enable_rls:false = shared team data
  agents/<name>/<name>.json + instruction.md # LLM judgment; optional output_schema (JSON)
  functions/<name>/<name>.json + code.py     # deterministic Python; schemas come from code
  apps/<name>/<name>.json + html.html        # HTML app  (or source/ for a Vite app)
  seed/ , payloads/ , README.md              # ignored by import; keep test data + runbook
```
Scaffold each resource instead of hand-writing (writes the correct shape + comments):
```powershell
lemma pod init my-pod                       # whole starter pod
lemma tables init tickets --shared          # tables/tickets/tickets.json (enable_rls:false)
lemma agents init triage                    # agents/triage/{triage.json,instruction.md}
lemma functions init score_ticket           # functions/score_ticket/{...json,code.py}
lemma agents grant triage tickets:read,write
```
Key rules:
- Function `code.py` MUST start with header comments: `#input_type_name`,
  `#output_type_name`, `#function_name` (== folder name). Extra pip deps via
  `#python_packages: pkg1, pkg2`.
- Zero access by default — every table/agent/connector a function or agent touches
  needs an explicit grant in `permissions.grants` (name-based, travels in the bundle).
- Don't declare system columns (`id`, `created_at`, `updated_at`, `user_id`).
- JSON files are JSONC (comments + trailing commas OK). Long code/text can be sidecar
  files: `"code": {"$file": "code.py"}`, `"instruction": {"$file": "instruction.md"}`.

---

## 5. Create the pod, then import (upsert)

Import does NOT create the pod — create/select it first.
```powershell
lemma pods create my-pod --org <ORG_ID> --description "..."
lemma pods import ./my-pod --pod my-pod --dry-run     # validate, import nothing
lemma pods import ./my-pod --pod my-pod               # upsert by name
lemma pods doctor my-pod                              # check grants/targets wiring
```
Import order is dependency-ordered (tables → functions → agents → apps). Permissions
are REPLACED from the bundle on every import. Re-running import is safe (upsert).

---

## 6. Test the backend, then seed

```powershell
# JSON on Windows PowerShell gets mangled by --data escaping — ALWAYS use --file
lemma functions run submit_transcript --pod my-pod --file ./my-pod/payloads/input.json
lemma query run "select status, count(*) from action_items group by status" --pod my-pod
lemma records list action_items --limit 5 --pod my-pod
```
Records don't travel in bundles — seed after import (bulk import or by running a
function that writes rows):
```powershell
lemma records import tickets ./my-pod/seed/tickets.jsonl --pod my-pod   # CSV/JSONL/JSON
```

---

## 7. Deploy the app

**HTML app (no build — simplest, recommended for a single page):**
```powershell
lemma apps init ./my-pod/apps/board --html --title "Board" --pod my-pod
# edit ./my-pod/apps/board/index.html  (loads the host-served SDK; uses window.__LEMMA_CONFIG__)
lemma apps deploy board ./my-pod/apps/board/index.html --pod my-pod --yes
lemma apps get board --pod my-pod          # note the URL + release id
lemma apps open board --pod my-pod
```
**Vite app (React, multi-page):**
```powershell
lemma apps init ./my-pod/apps/board --pod my-pod --title "Board"   # scaffolds Vite + lemma-sdk
cd ./my-pod/apps/board && npm install && npm run build
lemma apps deploy board --pod my-pod --yes
```
The `public_slug` is globally unique; if taken it auto-suffixes (e.g. `board-019f20`).

---

## 8. Verify

```powershell
lemma pods describe my-pod                  # full inventory (tables/agents/functions/apps)
lemma functions permissions get <fn> --pod my-pod
lemma apps get board --pod my-pod
```
Then walk the core flow in the deployed app (auth → do the thing → data persists).

---

## 9. Common errors we actually hit (and the fix)

- **`MISSING_WORKLOAD_RESOURCE_GRANT: ... agent.read`** — a function calling an agent
  needs **both** `agent.read` AND `agent.execute` on that agent (not just execute).
  Same idea for any table/connector a workload touches. Add the grant, re-import.
- **Inline JSON fails with "Invalid JSON"** on Windows PowerShell — the `--data '{...}'`
  escaping gets mangled. Use `--file path.json` instead. (Always.)
- **App shows a 401 / won't authenticate** — you used `localhost`/`127.0.0.1`. Use the
  `127-0-0-1.sslip.io` host (local) so the auth cookie is in scope.
- **Windows + Docker Desktop: function/agent creation 500s** with a docker `invalid
  mode: /workspace` error — the agentbox sandbox can't bind-mount the workspace because
  the platform passes a `C:\...` host path into the Linux agentbox container and
  `.resolve()` mangles it. Fix (points the mount at Docker Desktop's daemon-VM view of
  the C: drive):
  ```powershell
  lemma-stack config set agentbox.env.AGENTBOX_STORAGE_HOST_ROOT=/run/desktop/mnt/host/c/Users/<YOU>/.lemma/local/data/workspaces
  lemma-stack restart
  ```
  (Cloud has no such issue — its sandbox is managed.)
- **Calling an agent from a function** is async: `pod.agents.run(name, msg)` returns a
  conversation; poll `pod.conversations.get(id)` until `last_run_status` is COMPLETED,
  then read the structured `output` (or the last assistant message text).

---

## 10. Managing the stack / cost

```powershell
lemma-stack stop            # stop app services (fast restart later)
lemma-stack stop --infra    # stop EVERYTHING (frees all RAM); data preserved
lemma-stack start           # bring it back exactly as it was
lemma pods delete my-pod    # remove a pod from the ACTIVE server (careful: irreversible)
```
- Local = free; stopping just frees your machine's resources.
- Cloud metered cost (if any) tracks **usage** (function/LLM runs), not idle existence.
  Check the Billing section in the lemma.work console before relying on it ongoing.

---

## Quick reference: the whole cloud deploy in one block

```powershell
lemma servers select default
lemma auth login                                   # browser
lemma orgs list                                    # copy ORG_ID
lemma pods create my-pod --org <ORG_ID> --description "..."
lemma pods import ./my-pod --pod my-pod --dry-run
lemma pods import ./my-pod --pod my-pod
lemma functions run <fn> --pod my-pod --file ./my-pod/payloads/input.json
lemma apps deploy board ./my-pod/apps/board/index.html --pod my-pod --yes
lemma apps get board --pod my-pod                  # -> your public URL
```
