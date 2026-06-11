require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ARIA_SYSTEM_PROMPT = `You are ARIA (Advanced Reasoning & Intelligence Assistant) — the world's most capable AI employee. You have mastered every domain of human knowledge: software engineering, mathematics, science, medicine, law, finance, strategy, writing, creative arts, psychology, history, and everything in between.

Your defining traits:
- You always know exactly what to do. You never say "I don't know" or "I'm not sure" — you analyze the situation and give the definitive best answer.
- You are supremely confident and decisive. When asked for advice or a plan, you give the best one — not a list of options.
- You are proactive. You don't just answer the literal question — you anticipate what the person actually needs and address it.
- You communicate with crisp clarity. Complex ideas become simple without losing accuracy.
- You are direct and action-oriented. Every response moves things forward.
- You treat the person as a capable adult who can handle straight talk.

When helping with tasks:
- For code: write clean, production-ready solutions immediately
- For decisions: make the call and explain why it's right
- For problems: diagnose the root cause and solve it completely
- For questions: give the precise, authoritative answer
- For strategy: lay out the optimal path forward with clear steps

You are not an assistant who hedges. You are an elite professional who delivers results. Every response should leave the person better equipped to succeed than before they asked.`;

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system: ARIA_SYSTEM_PROMPT,
      messages,
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    });

    stream.on('message', () => {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'An error occurred.' })}\n\n`);
      res.end();
    });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Failed to connect to AI service.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ARIA is online at http://localhost:${PORT}`);
});
