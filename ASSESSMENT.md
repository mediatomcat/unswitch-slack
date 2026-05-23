# Unswitch → Slack-native: Technical Assessment

> Pre-build assessment for rebuilding Unswitch as a Slack-native application,
> replacing the previous Tauri desktop app. No implementation yet — this is the
> written recommendation that precedes any code.

## The one insight that reshapes everything

There's a hard platform constraint that changes the product, and it should be
internalized first.

**A Slack app cannot intercept, filter, or suppress Slack's own notifications.**
It can't hide messages from you, can't stop a DM from buzzing your phone, can't
sit between you and your channels as a filter. Slack gives apps *no* control over
the user's notification stream or message visibility.

The current Unswitch is built on exactly that mental model — a separate surface
(the "Incoming" → "Let Through" two-panel feed) that *catches* everything and
shows you only what survived triage. **That literal model does not exist inside
Slack.**

What a Slack-native Unswitch **can** do is genuinely powerful, but it's a reframe,
not a port:

- **Watch channels it's invited to**, triage each message with the existing
  Claude logic, and **DM you only what's let through** (or post a curated digest).
- **Own the App Home tab** as your "today" dashboard — the curated let-through
  list lives there, refreshed live.
- **Actually control your attention surface**: a Slack app *can* toggle
  **Do Not Disturb** and **set your Slack status** (with the right user scopes).
  So "Deep Work mode" stops being a metaphor and becomes Unswitch flipping on DND
  + setting a 🎯 status. That's the most native, most defensible feature.
- **Morning ritual** as a scheduled DM or Home-tab input; **modes** and
  **focus/lens** via slash commands.

The instinct to "feel native, not a web app forced into Slack" is right — and the
way to honor it is to drop the "filter wall" framing and lean into *routing +
DND/status control + a Home-tab digest*.

---

## 1. Current Slack knowledge

Solid working knowledge of the mature Slack app platform: Bolt (JS/Python), Block
Kit, Events API, slash commands, modals, App Home, interactive components, OAuth
scopes, Socket Mode, incoming webhooks, app manifests.

Two honest caveats:

- Model training cutoff is Jan 2026; Slack's platform moves (scopes, rate limits,
  the newer Deno-based "next-gen" platform). Verify specifics against current docs
  while building rather than trusting exact scope names or limits from memory.
- There are **two Slack platforms**: the classic **Bolt** model (scopes + Block
  Kit, run your own Node process) and the **next-gen platform** (Deno,
  functions/workflows/datastores, runs on Slack's infra, deployed via Slack CLI).
  For this project — custom LLM calls, an existing TypeScript codebase, full
  control — **Bolt JS is clearly the right choice.** Next-gen would fight us on
  external API calls and lock-in.

## 2. Concepts we need to understand

| Concept | What it is | Relevance to Unswitch |
|---|---|---|
| **Slack app** | Top-level entity at api.slack.com/apps; holds scopes, features, credentials. Configurable via a checked-in **manifest**. | The container. Define via manifest in the repo. |
| **Bot user / bot token** (`xoxb-`) | The app's identity that posts messages and reads events. | Core. This is "Unswitch" in your workspace. |
| **Block Kit** | JSON UI framework — `section`, `actions`, `input`, `context`, `header` blocks + elements (buttons, selects, datepickers). | **This is the entire UI now.** Replaces all React/CSS. |
| **Events API** | Subscribe to events (`message.channels`, `message.im`, `app_mention`, `app_home_opened`). Delivered via HTTP Request URL **or** Socket Mode. | How Unswitch *sees* messages to triage. |
| **Slash commands** | `/unswitch …`; must **ack within 3 seconds** (use `response_url` for slower follow-ups). | Set focus/lens, switch modes. |
| **Modals (views)** | Block Kit dialogs opened with a `trigger_id` (**valid ~3s**) via `views.open`. | Morning-ritual focus input; reply/park composer. |
| **App Home** | Per-user "Home" tab published via `views.publish`. | **The "today" dashboard** — the let-through digest. |
| **Interactive components** | Button clicks, selects, modal submits → delivered to the app; **ack within 3s**. | Snooze / Reply / Done / Park buttons. |
| **OAuth scopes** | Granular bot/user permissions (`chat:write`, `commands`, `channels:history`, `im:history`, `app_mentions:read`, `users:read`; user scopes `dnd:write`, `users.profile:write`). | New concept vs. the desktop app, which had none. DND/status control needs **user** scopes. |
| **Socket Mode** + app-level token (`xapp-`) | App dials *out* over WebSocket; no public URL needed. | **Best dev path. No ngrok.** Note: Socket Mode apps **cannot** be listed in the public Marketplace. |
| **Incoming webhooks** | One-way URL to post into a single channel. No interactivity. | Too limited; not the path. |

Two practical constraints to keep front of mind: **the 3-second ack rule** on
commands/interactions, and the **~3-second `trigger_id` expiry** for opening modals.

## 3. Can we build and test locally?

**Yes, fully.** With **Socket Mode**, the Bolt app runs on `localhost`, dials out
to Slack over a WebSocket, and receives every event/command/interaction with no
inbound network exposure. `npm run dev` and you're live in the test workspace.

## 4. Do we need ngrok / Socket Mode / a tunnel?

You need **one of**: Socket Mode **or** a public Request URL (ngrok / cloudflared).

- **For dev and for a private internal app → Socket Mode. No tunnel, no ngrok.**
  This is the recommended path and the simplest.
- A tunnel is only needed to exercise the **HTTP Request-URL** delivery path —
  required for a publicly distributed Marketplace app (those can't use Socket
  Mode). That's a later concern, if ever.

## 5. Do we need Slack's approval?

**No — not to build, install, or test privately.** Create the app, install it into
a workspace you administer, and test freely. Slack's **review/approval is only
required to list publicly in the Slack Marketplace.**

The only gate for private use is a *workspace* setting: in managed orgs, installing
an app may need a workspace admin's OK. In your own dev workspace you're the admin,
so there's no gate at all.

## 6. Best setup for a private internal test workspace

1. **Create a fresh free Slack workspace** you own (e.g., "Unswitch Dev"). You're
   admin → zero install friction.
2. **Define the app via a manifest** checked into the repo — declarative,
   reproducible, reviewable.
3. **Enable Socket Mode**, generate an **app-level token** (`xapp-`, scope
   `connections:write`); get the **bot token** (`xoxb-`) on install. Put both in
   `.env` (gitignored).
4. **Bolt JS** with `socketMode: true`, run under `tsx watch`/`nodemon` for hot
   reload.
5. **Seed it**: a couple of channels, and either a second test account or a script
   to play "senders."
6. **Reuse the demo data**: a small script that replays the old
   `src/demo/timeline.json` (24 synthetic events) by posting them into a test
   channel gives a repeatable triage demo without waiting for live traffic. This
   is the cleanest reuse of the existing simulator concept.

## 7. Repo strategy — continue, branch, or fresh?

**Decision: a fresh repo** (`unswitch-slack`), carrying over only the portable
logic.

Rationale: the runtimes have nothing in common. The old repo is a Tauri desktop
shell + Vite/React SPA (Rust toolchain, browser build, shadcn/Tailwind). The Slack
app is a long-running **Node server process** talking to Slack — different
dependencies, build, and deploy. Cramming a Bolt server into the Tauri repo means
a confusing dual dependency tree and two incompatible build configs in one place.

The valuable shared code is small and easy to copy: `triage.ts`, `events.ts`, the
prompts. A clean break is faster and clearer than living with desktop scaffolding
that will never run.

Alternatives considered:

- **Branch the existing repo** — only if a revert to the desktop app is likely.
  ~90% of it (all UI, Tauri, CSS) gets deleted on day one, so the branch mostly
  preserves git history. Cheap insurance, messy workspace.
- **Monorepo** (`packages/core` for shared triage logic, `apps/slack` for Bolt,
  keep `apps/desktop`) — only if both surfaces are to be maintained from one
  triage engine. More setup; right only if the desktop app lives on.

The desktop app is being retired, so the old repo stays as a tagged reference and
this repo starts fresh.

## 8. What's realistically reusable

**High-value, near-direct ports** (the crown jewels):

- **The triage prompt + decision schema** — `triage.ts`: the `BASE_SYSTEM` prompt,
  `MODE_CONTEXT`, the lens/focus logic, the VIP rules, and the structured-output
  `triage` tool (`decision`/`urgency`/`reason`/`priority`). This is the actual
  product IP and it moves over almost verbatim.
- **The domain model** — `events.ts` (`IncomingEvent`, `TriageDecision`, `Mode`,
  priority enum). `EventSource` already includes `slack_dm`/`slack_channel`. Minor
  reshaping to map a Slack event payload → `IncomingEvent`.
- **The conceptual model** — modes (founder/deep_work/meeting/free), the daily
  *lens*, VIP senders, let-through/hold, park/resume. All the product *thinking*
  survives intact.
- **AI integration pattern** — Anthropic SDK + tool-use for structured triage.
  **With one important upgrade:** it moves **server-side** in the Bolt process.
  The current code uses `dangerouslyAllowBrowser: true` and ships the API key to
  the client — moving to a backend **fixes that security problem for free.**

**Reusable as test scaffolding:**

- **`timeline.json` + simulator concept** — repurpose as a seed/replay script for
  the test workspace.

**Not reused:**

- **Authentication** — the desktop app has none. Slack OAuth/scopes is net-new.

## 9. What must be rebuilt (Slack's UX model is different)

- **The entire UI layer.** `App.tsx` (~1,000 lines), `App.css` (~1,500 lines),
  `MorningRitual.tsx`, the shadcn components, all icons/animations → **gone.**
  Slack UI is Block Kit JSON. Nothing in the React/CSS transfers; only the
  *interaction intent* does.
- **The two-panel Incoming/Let-Through dashboard** → no equivalent. Closest native
  analog: the **App Home tab** (one scrollable Block Kit surface) for the curated
  digest, plus **bot DMs** for real-time let-throughs.
- **Custom animations, the VIP audio beep, toasts, slide transitions** → no
  equivalent. Slack has no custom motion or audio control.
- **The voice modal / mic capture** → Slack apps can't capture microphone input.
  "Voice actions" would have to become typed modal input, or be dropped for v1.
  This is the feature that loses the most in translation — flag it early.
- **Morning ritual** → rebuild as a **scheduled DM** (or App Home input) that opens
  a modal to capture today's focus. The *interaction* survives; the implementation
  is entirely new.
- **Real-time in-app feed** → replaced by Slack pushing events to the app + the app
  pushing DMs / re-publishing the Home tab.

**The genuinely native *new* capability to add:** wiring **modes → real DND +
status** (`dnd.setSnooze`, `users.profile.set`). The desktop app could only
*pretend* to protect focus; in Slack, Unswitch can actually enforce it. That's the
feature that makes it feel native rather than bolted-on.

## 10. Safest first prototype

Prove the plumbing and the core loop with the smallest possible surface. Two
milestones:

**Milestone 0 — "it round-trips" (half a day, no Claude yet).** Bolt JS in Socket
Mode in the dev workspace. A `/unswitch` slash command that replies, and an
`app_mention` the bot answers. Confirms the entire local dev loop (Socket Mode,
tokens, ack timing) before any AI is involved.

**Milestone 1 — "the triage loop works on real Slack messages."** Then:

1. Bot listens to messages in channels it's invited to.
2. Each message → mapped to `IncomingEvent` → the ported `triageEvent()` (Claude,
   **server-side**).
3. **Let-through** → bot **DMs you** a Block Kit card (sender, content, the AI
   `reason`, urgency badge) with **Snooze / Reply / Done** buttons. **Held** →
   silently logged, not surfaced.
4. `/unswitch focus <text>` sets the daily lens; `/unswitch mode <deep|founder|meeting|free>`
   switches mode (in-memory for now).

This validates the four things that carry real risk — Slack event delivery
locally, the prompt working on real messages, Block Kit buttons round-tripping
within the 3s ack, and the API key safely off the client — while **deliberately
deferring** App Home, OAuth distribution, DND/status control, and any database.
Those are well-understood follow-ons once the loop is proven.

Stretch goal for Milestone 1 that maximizes the "native" feel for minimum effort:
have `mode deep_work` call `dnd.setSnooze`. A few lines, and the most convincing
demonstration that this is a Slack-native tool, not a web app in a costume.

---

## Net recommendation

Fresh Bolt-JS repo · Socket Mode for dev (no ngrok) · no Slack approval needed for
private testing · port the triage prompt/model/schema and rebuild 100% of the UI
as Block Kit · reframe from "notification filter" to "channel-watching triage +
App Home digest + real DND/status control" · start with the Milestone 0/1
prototype above.

## Open decisions

- **Voice actions**: must-have or cut for v1? Slack can't capture mic input, so
  this becomes typed modal input or is dropped. Shapes v1 scope.
