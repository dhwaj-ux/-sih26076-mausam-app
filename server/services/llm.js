/**
 * LLM adapter.
 *
 * The API key lives ONLY on the server - the browser never sees it.
 * Supported free providers: Google Gemini, Groq, OpenRouter.
 * If none is configured (or the call fails) the caller falls back to the
 * built-in offline knowledge base, so the demo never breaks.
 */
'use strict';

const PROVIDERS = {
  gemini: {
    key: () => process.env.GEMINI_API_KEY,
    model: () => process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    build: (key, model, sys, prompt) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ parts: [{ text: prompt }] }],
      }),
      parse: (j) => j.candidates && j.candidates[0].content.parts[0].text,
    }),
  },
  groq: {
    key: () => process.env.GROQ_API_KEY,
    model: () => process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    build: (key, model, sys, prompt) => ({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 750,
      }),
      parse: (j) => j.choices && j.choices[0].message.content,
    }),
  },
  openrouter: {
    key: () => process.env.OPENROUTER_API_KEY,
    model: () => process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    build: (key, model, sys, prompt) => ({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
      }),
      parse: (j) => j.choices && j.choices[0].message.content,
    }),
  },
};

/** Which provider is actually usable right now. */
function activeProvider() {
  const wanted = (process.env.LLM_PROVIDER || '').trim().toLowerCase();
  if (wanted && PROVIDERS[wanted] && PROVIDERS[wanted].key()) return wanted;
  // fall back to whichever key happens to be present
  for (const name of Object.keys(PROVIDERS)) {
    if (PROVIDERS[name].key()) return name;
  }
  return null;
}

// Shared with the browser: public/js/context.js
const { systemPrompt, markdownToHtml } = require('../../public/js/context.js');

/**
 * @returns {Promise<{html:string, source:'llm'|null, provider:string|null, error?:string}>}
 */
async function ask({ persona, question, context }) {
  const name = activeProvider();
  if (!name) return { html: null, source: null, provider: null, error: 'no provider configured' };

  const p = PROVIDERS[name];
  const req = p.build(p.key(), p.model(), systemPrompt(persona), `CONTEXT (live data):\n${context}\n\nUSER QUESTION: ${question}`);

  try {
    const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: req.body });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'provider error');
    const text = p.parse(json);
    if (!text) throw new Error('empty completion');
    return { html: markdownToHtml(text), source: 'llm', provider: name };
  } catch (err) {
    return { html: null, source: null, provider: name, error: err.message };
  }
}

module.exports = { ask, systemPrompt, activeProvider, PROVIDERS, markdownToHtml };
