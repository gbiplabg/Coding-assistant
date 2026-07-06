# Baka — AI Code Assistant

A minimal, production-grade personal coding assistant. Paste code, fix bugs, and
reason about your codebase with an AI pair programmer — **you bring your own
Anthropic and/or OpenAI API key**, entered right in the UI. No database, no
backend state, no sign-up.

_Developed by **Biplab18**._

## Features

- **Bug fixing & code chat** — paste code or describe a problem and get a
  streamed, concise answer.
- **Two providers** — Claude (Anthropic) and GPT (OpenAI). Add either or both
  keys; the model picker uses the matching one.
- **Full model range** — cheapest → most expensive, with per-1M-token pricing
  shown (Haiku 4.5 → Fable 5 for Claude, GPT-4o mini → GPT-4o for OpenAI).
- **Per-session cost tracking** — every reply records real token usage and an
  estimated cost; the header shows a running total for the conversation.
- **Per-conversation sessions** — like Claude. Create, rename, delete. Stored in
  your browser (`localStorage`), never on a server.
- **Animated code blocks** — syntax-highlighted, with a signature "scanner"
  reveal, line numbers, and one-click copy.
- **File uploads** — images (vision, both providers), PDFs (Claude), and Excel /
  CSV (parsed to text client-side).
- **Quick actions** — one-tap _Fix bug · Explain · Optimize · Add tests_.
- **Animated command button** and a wide, readable response area.
- **Keys from the UI** — stored locally, sent directly to the provider. No env
  vars required to deploy.

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Anthropic SDK · OpenAI SDK ·
framer-motion · highlight.js · SheetJS (xlsx).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Open the app, click **Settings**, paste your Anthropic API key
(from <https://console.anthropic.com/settings/keys>), and start chatting.

## Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Import it at <https://vercel.com/new> — Vercel auto-detects Next.js.
3. Deploy. **No environment variables needed** — each user supplies their own
   API key in the UI.

Or from the CLI:

```bash
npm i -g vercel
vercel
```

## How it works

- The browser stores your API keys and chat sessions in `localStorage`.
- On send, the client POSTs the conversation to `/api/chat` with the relevant
  key in the `x-api-key` header and the chosen `provider`/`model`. That
  serverless route calls the Anthropic or OpenAI streaming API and streams the
  reply back, appending token-usage metadata at the end so the UI can compute
  cost. Keys are never persisted server-side.
- Pricing shown in Settings is approximate list price per 1M tokens; the cost of
  each chat is estimated from the actual token counts the provider reports.

## Notes

- Your API key lives in your browser and is transmitted only to your own
  serverless function and on to Anthropic. Treat the machine/browser as trusted.
- `xlsx` (SheetJS) has an open npm advisory; here it only parses files _you_
  choose, entirely in the browser. Swap to `https://cdn.sheetjs.com` build if you
  want the latest patched release.
