# ARIA — AI Employee Workspace

A self-hosted chat workspace with a built-in **ARIA** persona (a supremely capable AI employee) that runs on **any model you plug in** — local models via Ollama / LM Studio / vLLM, or cloud models via the Anthropic and OpenAI-compatible APIs (OpenAI, OpenRouter, Groq, Together, etc.).

## Features

- **Bring your own models.** Add as many providers as you like from the UI — no code changes.
  - **Claude / Anthropic** — native Anthropic SDK, with optional adaptive thinking.
  - **Local & OpenAI-compatible** — any server that speaks the OpenAI `/v1/chat/completions` API (Ollama, LM Studio, vLLM, OpenAI, OpenRouter, Groq, Together…).
- **Model switcher** in the top bar — pick a model per conversation.
- **Connection test + model discovery** — verify a provider and auto-list its available model ids.
- **Multi-conversation history** with a sidebar (stored in your browser).
- **Streaming responses** with live markdown rendering and code blocks.
- **Custom system prompts** per model (defaults to the ARIA persona).
- **Keys stay on the server** — API keys live in `config/models.json` (gitignored) and are never sent back to the browser.

## Quick start

```bash
npm install
cp .env.example .env        # optional: set ANTHROPIC_API_KEY to auto-seed a Claude model
npm start
```

Open **http://localhost:3000**, click **Manage models**, and add a model.

### Add a local model (Ollama)

1. Run Ollama and pull a model: `ollama pull llama3.1`
2. In **Manage models** → choose **Local / OpenAI-compatible**
3. Base URL: `http://localhost:11434/v1` (click the **Ollama** chip)
4. Leave the API key blank, click **Fetch available**, pick your model, **Save**.

### Add a cloud model

Pick the right type (Claude → Anthropic; everything else → OpenAI-compatible), paste the base URL and API key, fetch/enter the model id, and save.

## How it works

- `server.js` — Express server. Stores providers in `config/models.json`, exposes a small CRUD + test API, and streams chat via Server-Sent Events. Routes Anthropic providers through `@anthropic-ai/sdk` and OpenAI-compatible providers through the `openai` SDK.
- `public/` — the single-page UI (`index.html`, `style.css`, `app.js`). Conversations are kept in `localStorage`.

## Security note

This is a personal/self-hosted tool. API keys are stored in plaintext in `config/models.json` on the server. Don't expose it to the public internet without adding authentication.
