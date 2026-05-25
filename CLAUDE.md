# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status: Milestone 0 scaffolded

The Bolt JS + TypeScript + Socket Mode dev loop is in place: `src/app.ts` registers a `/unswitch` slash command and an `app_mention` handler, defined by a checked-in `manifest.yaml`. No Claude, triage, persistence, or App Home yet. **[ASSESSMENT.md](ASSESSMENT.md) is the source of truth** for direction and decisions; read it before proposing or writing code, and keep it in sync if decisions change.

## What this project is

A Slack-native rebuild of **Unswitch**, an AI focus assistant that triages incoming messages with Claude. It replaces a retired Tauri desktop prototype.

The desktop original lives at `git@github.com:mediatomcat/unswitch.git` (locally `../unswitch`). It is **retired**, kept only as a reference to port logic from — do not develop it further.

## The constraint that drives the whole design

**A Slack app cannot intercept, filter, or suppress Slack's own notifications, nor hide messages.** The desktop app's core model — a wall that catches everything and shows only what survives triage — *does not exist inside Slack*. Do not try to recreate it.

The Slack-native model instead:
- **Watch** channels the bot is invited to → triage each message → **DM only the let-throughs** (or post a digest). Held messages are logged, not surfaced.
- **App Home tab** is the "today" dashboard / curated digest surface.
- **Modes map to real Slack controls**: `deep_work` should toggle actual Do Not Disturb (`dnd.setSnooze`) and set Slack status (`users.profile.set`). This is the most native, most defensible feature — the desktop app could only *pretend* to protect focus.

When in doubt about whether a feature is possible, assume Slack does **not** let apps control the user's notification stream, and design around routing + DND/status + Home-tab digest.

## Planned architecture (not yet built)

- **Bolt JS (TypeScript)** — one long-running Node server process. This is a backend service, not an SPA. (Bolt JS chosen over Slack's next-gen Deno platform for control over external LLM calls and to reuse the existing TS code.)
- **Anthropic SDK runs server-side** in the Bolt process. The desktop app called Claude from the browser with `dangerouslyAllowBrowser: true`, exposing the key — the move to a backend fixes that; never reintroduce client-side key usage.
- **Socket Mode for dev** — the app dials out over WebSocket; no public URL/ngrok needed, and no Slack approval is required for private testing in a workspace you admin.
- **Define the app via a checked-in manifest** rather than only clicking through the dashboard UI.
- Triage uses **Claude tool-use for structured output** (the `triage` tool returning `decision`/`urgency`/`reason`/`priority`), model `claude-haiku-4-5-...`.

### Port vs. rebuild (from the retired `../unswitch`)

- **Port near-verbatim**: the triage prompt + `MODE_CONTEXT` + lens/VIP logic + the `triage` tool schema (`src/services/triage.ts`); the domain model (`src/types/events.ts` — `IncomingEvent`, `TriageDecision`, `Mode`). Map a Slack event payload → `IncomingEvent` at the boundary.
- **Reuse as test scaffolding**: `src/demo/timeline.json` (synthetic events) can be replayed into a test channel to drive triage without live traffic.
- **Rebuild entirely as Block Kit**: 100% of the UI. None of the React/CSS/animations/voice-modal transfer — only the interaction *intent*. Slack has no custom motion, no audio, and cannot capture microphone input (so "voice actions" are an open v1 scope question — see ASSESSMENT.md).

## Slack platform gotchas to respect

- **3-second ack rule**: slash commands and interactive callbacks must be acknowledged within ~3s; do slow work after acking (e.g. via `response_url` or a follow-up `chat.postMessage`).
- **`trigger_id` expires in ~3s**: open modals (`views.open`) immediately on the triggering interaction, not after an async call.
- **Tokens**: bot token `xoxb-` (after install), app-level token `xapp-` with `connections:write` (for Socket Mode). DND/status control needs **user-token** scopes (`dnd:write`, `users.profile:write`), distinct from bot scopes. Keep tokens in `.env`.

## Dev setup

Bolt JS app run under `tsx watch` in Socket Mode against a personal dev workspace you administer, seeded with a couple of channels. Requires Node 18+. Tokens live in `.env` (copy from `.env.example`); see README "Local setup" for how to create the app from `manifest.yaml` and obtain the three tokens.

```bash
npm install
npm run dev        # tsx watch src/app.ts — Socket Mode, hot reload
npm run build      # tsc → dist/
npm start          # node dist/app.js
npm run typecheck  # tsc --noEmit
```

No test runner yet — add one (and document how to run a single test here) when the first testable logic lands in Milestone 1.

## First prototype (the safe path)

- **Milestone 0**: `/unswitch` slash command + `app_mention` round-trip in Socket Mode — no Claude. Proves the dev loop, tokens, and ack timing.
- **Milestone 1**: watch channel messages → ported `triageEvent()` server-side → DM let-throughs as a Block Kit card (reason + Snooze/Reply/Done buttons); `/unswitch focus <text>` and `/unswitch mode <…>` (in-memory). Defer App Home, OAuth distribution, persistence. Stretch: wire `deep_work` to `dnd.setSnooze`.
