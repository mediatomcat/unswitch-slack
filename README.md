# unswitch-slack

Slack-native rebuild of **Unswitch** — an AI focus assistant that triages your
incoming messages and protects your attention. This replaces the previous Tauri
desktop prototype.

Status: **Milestone 0 scaffolded.** The Bolt JS + TypeScript + Socket Mode dev
loop is in place (a `/unswitch` slash command and an `app_mention` round-trip).
No Claude, no triage, no persistence yet. The technical direction lives in
[ASSESSMENT.md](ASSESSMENT.md).

## Direction at a glance

- **Stack**: Bolt JS (TypeScript), Anthropic SDK server-side (later), Socket Mode for dev.
- **Native reframe**: Slack apps can't filter your notifications, so Unswitch
  becomes a channel-watching triage bot + an App Home digest + real DND/status
  control — not a notification wall.
- **Reused from the desktop app**: the Claude triage prompt, decision schema, and
  domain model (Milestone 1+). Everything UI is rebuilt as Block Kit.

See [ASSESSMENT.md](ASSESSMENT.md) for the full breakdown.

---

## Local setup (Milestone 0)

### Prerequisites

- Node.js 18+ and npm.
- A Slack workspace **you administer** (create a free one, e.g. "Unswitch Dev",
  so there's zero install friction).

### 1. Create the Slack app from the manifest

1. Go to <https://api.slack.com/apps> → **Create New App** → **From an app manifest**.
2. Pick your dev workspace.
3. Paste the contents of [`manifest.yaml`](manifest.yaml) (switch the editor to
   YAML), then **Create**.

This declares the bot, the `/unswitch` command, the `app_mention` event
subscription, the bot scopes (`commands`, `app_mentions:read`, `chat:write`),
and enables Socket Mode — all at once.

### 2. Get your three tokens

| Token | Where | Goes in `.env` as |
|---|---|---|
| App-level token (`xapp-…`) | **Basic Information → App-Level Tokens → Generate Token**, add the `connections:write` scope | `SLACK_APP_TOKEN` |
| Bot token (`xoxb-…`) | **Install App → Install to Workspace**, then copy the **Bot User OAuth Token** | `SLACK_BOT_TOKEN` |
| Signing secret | **Basic Information → App Credentials → Signing Secret** | `SLACK_SIGNING_SECRET` |

### 3. Configure the environment

```bash
cp .env.example .env
# then edit .env and paste in the three values above
```

### 4. Install and run

```bash
npm install
npm run dev      # tsx watch — hot reloads on save
```

You should see:

```
⚡️ Unswitch (Milestone 0) is running in Socket Mode.
   Listening for: /unswitch (slash command) and app_mention (events).
```

### 5. Try it in Slack

- **Slash command**: type `/unswitch hello` in any channel. Unswitch replies
  (only visible to you) confirming it's connected.
- **Mention**: invite the bot to a channel (`/invite @unswitch`), then post
  `@unswitch ping`. It replies in-thread that it's alive and listening.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run in Socket Mode with hot reload (`tsx watch`). |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm start` | Run the compiled build (`node dist/app.js`). |
| `npm run typecheck` | Type-check without emitting. |

---

## What's next (Milestone 1)

Watch channel messages → map each to an `IncomingEvent` → run the ported
server-side triage (Claude) → DM let-throughs as a Block Kit card with
Snooze / Reply / Done buttons. The listeners in `src/app.ts` will move into
`src/listeners/` as that lands. See [ASSESSMENT.md](ASSESSMENT.md) §10.
