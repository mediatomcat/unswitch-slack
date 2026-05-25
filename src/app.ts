import 'dotenv/config';
import { App, LogLevel } from '@slack/bolt';

/**
 * Unswitch — Milestone 0
 * ----------------------
 * Goal: prove the Slack dev loop end to end (Bolt JS + TypeScript + Socket Mode).
 * No Claude, no triage, no persistence yet — just a slash command and an
 * app_mention that round-trip through Slack.
 *
 * Milestone 1 will add: message watching (message.channels / message.im),
 * server-side triage (ported triageEvent()), and DM let-through cards.
 * When that lands, the listeners below should move into src/listeners/.
 */

// --- Validate required environment up front, fail loud ---
const REQUIRED_ENV = ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_SIGNING_SECRET'] as const;
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`✖ Missing required environment variable(s): ${missing.join(', ')}`);
  console.error('  Copy .env.example to .env and fill in your Slack tokens, then retry.');
  process.exit(1);
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  // Not used while socketMode is true, but kept for a future HTTP receiver.
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  logLevel: LogLevel.INFO,
});

// --- /unswitch slash command -------------------------------------------------
// ack() MUST be called within ~3 seconds. We ack first, then reply.
app.command('/unswitch', async ({ command, ack, respond }) => {
  await ack();

  await respond({
    response_type: 'ephemeral',
    text: 'Unswitch is connected.', // fallback for notifications / a11y
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:wave: *Unswitch is connected.*\nYou ran \`/unswitch ${command.text ?? ''}\`.`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Milestone 0 — dev loop check. Message triage arrives in Milestone 1.',
          },
        ],
      },
    ],
  });
});

// --- app_mention event -------------------------------------------------------
// Events API messages are auto-acked by Bolt, so no explicit ack() is needed.
app.event('app_mention', async ({ event, say }) => {
  await say({
    thread_ts: event.thread_ts ?? event.ts, // reply in-thread to keep channels tidy
    text: 'Unswitch is alive and listening.', // fallback
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:white_check_mark: Hi <@${event.user}> — Unswitch is alive and listening. _(Milestone 0)_`,
        },
      },
    ],
  });
});

// --- Catch-all error handler -------------------------------------------------
app.error(async (error) => {
  console.error('⚠️  Unhandled Bolt error:', error);
});

// --- Start -------------------------------------------------------------------
(async () => {
  await app.start();
  console.log('⚡️ Unswitch (Milestone 0) is running in Socket Mode.');
  console.log('   Listening for: /unswitch (slash command) and app_mention (events).');
})();
