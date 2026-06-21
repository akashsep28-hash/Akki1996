require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------------------------------------------------------ *
 * ARIA persona — the default system prompt for any model the user adds
 * ------------------------------------------------------------------ */
const DEFAULT_SYSTEM_PROMPT = `You are ARIA (Advanced Reasoning & Intelligence Assistant) — the world's most capable AI employee. You have mastered every domain of human knowledge: software engineering, mathematics, science, medicine, law, finance, strategy, writing, creative arts, psychology, history, and everything in between.

Your defining traits:
- You always know exactly what to do. You analyze the situation and give the definitive best answer.
- You are confident and decisive. When asked for advice or a plan, you give the best one — not an overwhelming list of options.
- You are proactive. You anticipate what the person actually needs and address it.
- You communicate with crisp clarity. Complex ideas become simple without losing accuracy.
- You are direct and action-oriented. Every response moves things forward.

When helping with tasks:
- For code: write clean, production-ready solutions.
- For decisions: make the call and explain why it's right.
- For problems: diagnose the root cause and solve it completely.
- For questions: give the precise, authoritative answer.

You are an elite professional who delivers results. Every response should leave the person better equipped to succeed than before they asked.`;

/* ------------------------------------------------------------------ *
 * Provider storage (config/models.json) — keys never leave the server
 * ------------------------------------------------------------------ */
const CONFIG_DIR = path.join(__dirname, 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'models.json');

function ensureConfig() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_FILE)) {
    const seed = [];
    // Seed a default Claude provider if an API key is present in the environment.
    if (process.env.ANTHROPIC_API_KEY) {
      seed.push({
        id: crypto.randomUUID(),
        label: 'ARIA (Claude Opus 4.8)',
        type: 'anthropic',
        baseURL: '',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-opus-4-8',
        system: '',
        thinking: true,
        maxTokens: 4096,
      });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(seed, null, 2));
  }
}

function loadProviders() {
  ensureConfig();
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveProviders(list) {
  ensureConfig();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(list, null, 2));
}

// Strip the secret before sending a provider to the browser.
function publicView(p) {
  return {
    id: p.id,
    label: p.label,
    type: p.type,
    baseURL: p.baseURL || '',
    model: p.model,
    system: p.system || '',
    thinking: !!p.thinking,
    maxTokens: p.maxTokens || 4096,
    hasKey: !!p.apiKey,
  };
}

function normalize(body, existing = {}) {
  const type = body.type === 'openai' ? 'openai' : 'anthropic';
  return {
    id: existing.id || crypto.randomUUID(),
    label: (body.label || '').trim() || (type === 'anthropic' ? 'Claude' : 'Custom model'),
    type,
    baseURL: (body.baseURL || '').trim(),
    // Keep the existing key if the client sends an empty string on edit.
    apiKey: body.apiKey && body.apiKey.trim() ? body.apiKey.trim() : (existing.apiKey || ''),
    model: (body.model || '').trim(),
    system: (body.system || '').trim(),
    thinking: !!body.thinking,
    maxTokens: Number(body.maxTokens) > 0 ? Number(body.maxTokens) : 4096,
  };
}

/* ------------------------------------------------------------------ *
 * Client builders
 * ------------------------------------------------------------------ */
function anthropicClient(p) {
  const opts = { apiKey: p.apiKey || 'missing' };
  if (p.baseURL) opts.baseURL = p.baseURL;
  return new Anthropic(opts);
}

function openaiClient(p) {
  return new OpenAI({
    apiKey: p.apiKey || 'not-needed', // local servers ignore this
    baseURL: p.baseURL || 'https://api.openai.com/v1',
  });
}

/* ------------------------------------------------------------------ *
 * Provider CRUD + discovery
 * ------------------------------------------------------------------ */
app.get('/api/models', (req, res) => {
  res.json(loadProviders().map(publicView));
});

app.post('/api/models', (req, res) => {
  const list = loadProviders();
  const provider = normalize(req.body);
  if (!provider.model) return res.status(400).json({ error: 'A model id is required.' });
  list.push(provider);
  saveProviders(list);
  res.json(publicView(provider));
});

app.put('/api/models/:id', (req, res) => {
  const list = loadProviders();
  const idx = list.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Provider not found.' });
  const updated = normalize(req.body, list[idx]);
  if (!updated.model) return res.status(400).json({ error: 'A model id is required.' });
  list[idx] = updated;
  saveProviders(list);
  res.json(publicView(updated));
});

app.delete('/api/models/:id', (req, res) => {
  const list = loadProviders().filter((p) => p.id !== req.params.id);
  saveProviders(list);
  res.json({ ok: true });
});

// Test a connection and discover available model ids.
// Accepts either a saved provider {id} or a full inline config.
app.post('/api/models/test', async (req, res) => {
  let provider = req.body;
  if (req.body.id) {
    const found = loadProviders().find((p) => p.id === req.body.id);
    if (found) provider = found;
  } else {
    provider = normalize(req.body);
  }

  try {
    if (provider.type === 'openai') {
      const client = openaiClient(provider);
      const result = await client.models.list();
      const models = (result.data || []).map((m) => m.id).sort();
      return res.json({ ok: true, models });
    }
    const client = anthropicClient(provider);
    const result = await client.models.list({ limit: 100 });
    const models = (result.data || []).map((m) => m.id);
    return res.json({ ok: true, models });
  } catch (err) {
    return res.json({ ok: false, error: err.message || 'Connection failed.' });
  }
});

/* ------------------------------------------------------------------ *
 * Chat — routes to the selected provider and streams via SSE
 * ------------------------------------------------------------------ */
app.post('/api/chat', async (req, res) => {
  const { providerId, messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format.' });
  }

  const provider = loadProviders().find((p) => p.id === providerId);
  if (!provider) {
    return res.status(404).json({ error: 'Selected model is not configured.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  const system = provider.system || DEFAULT_SYSTEM_PROMPT;

  try {
    if (provider.type === 'openai') {
      await streamOpenAI(provider, system, messages, send);
    } else {
      await streamAnthropic(provider, system, messages, send);
    }
    send({ type: 'done' });
  } catch (err) {
    console.error('Chat error:', err);
    send({ type: 'error', content: err.message || 'An error occurred.' });
  } finally {
    res.end();
  }
});

async function streamAnthropic(provider, system, messages, send) {
  const client = anthropicClient(provider);
  const params = {
    model: provider.model,
    max_tokens: provider.maxTokens || 4096,
    system,
    messages,
  };
  if (provider.thinking) params.thinking = { type: 'adaptive' };

  const stream = client.messages.stream(params);
  stream.on('text', (text) => send({ type: 'text', content: text }));
  await stream.finalMessage();
}

async function streamOpenAI(provider, system, messages, send) {
  const client = openaiClient(provider);
  const stream = await client.chat.completions.create({
    model: provider.model,
    messages: [{ role: 'system', content: system }, ...messages],
    stream: true,
    max_tokens: provider.maxTokens || 4096,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) send({ type: 'text', content: delta });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  ensureConfig();
  console.log(`ARIA workspace running at http://localhost:${PORT}`);
});
