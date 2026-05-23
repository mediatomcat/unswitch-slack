# unswitch-slack

Slack-native rebuild of **Unswitch** — an AI focus assistant that triages your
incoming messages and protects your attention. This replaces the previous Tauri
desktop prototype.

Status: **pre-build.** No application code yet. The technical direction lives in
[ASSESSMENT.md](ASSESSMENT.md) — read that first.

## Direction at a glance

- **Stack**: Bolt JS (TypeScript), Anthropic SDK server-side, Socket Mode for dev.
- **Native reframe**: Slack apps can't filter your notifications, so Unswitch
  becomes a channel-watching triage bot + an App Home digest + real DND/status
  control — not a notification wall.
- **Reused from the desktop app**: the Claude triage prompt, decision schema, and
  domain model. Everything UI is rebuilt as Block Kit.

See [ASSESSMENT.md](ASSESSMENT.md) for the full breakdown and the proposed
first prototype.
