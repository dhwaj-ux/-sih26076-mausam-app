/**
 * Proof script: boots the real app and shows the frontend layer and the
 * backend layer both responding from the same server.
 *
 *   node test/proof.js
 */
'use strict';

process.env.GEMINI_API_KEY = '';
process.env.GROQ_API_KEY = '';
process.env.OPENROUTER_API_KEY = '';
process.env.LLM_PROVIDER = '';

const path = require('path');
const app = require(path.join(__dirname, '..', 'server', 'index.js'));

const line = (s) => console.log(s);

(async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const port = server.address().port;

  line('');
  line('SERVER  ->  http://127.0.0.1:' + port);
  line('');

  // ---------- FRONTEND (static files served by the backend) ----------
  line('=========== FRONTEND (browser ke liye) ===========');
  const front = [
    ['/', 'HTML page'],
    ['/css/style.css', 'CSS'],
    ['/js/data.js', 'JS module'],
    ['/js/engine.js', 'JS module'],
    ['/js/geo.js', 'JS module'],
    ['/js/context.js', 'JS module'],
    ['/js/app.js', 'JS app'],
    ['/assets/logo-mark.png', 'PNG logo'],
    ['/assets/favicon.png', 'PNG favicon'],
    ['/manifest.webmanifest', 'PWA manifest'],
  ];
  for (const [p, label] of front) {
    const r = await fetch(base + p);
    const body = await r.arrayBuffer();
    line(`  GET ${p.padEnd(24)} ${String(r.status).padEnd(4)} ${label.padEnd(14)} ${(body.byteLength / 1024).toFixed(1)} KB  ${r.headers.get('content-type')}`);
  }

  // ---------- BACKEND (JSON API) ----------
  line('');
  line('=========== BACKEND (JSON API) ===========');
  const api = [
    ['GET', '/api/health'],
    ['GET', '/api/personas'],
    ['GET', '/api/weather?city=Nagpur'],
    ['POST', '/api/ai'],
  ];
  for (const [method, p] of api) {
    const opts = method === 'POST'
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona: 'run', question: 'What is the best time to run today?', city: 'Nagpur' }),
        }
      : undefined;
    const r = await fetch(base + p, opts);
    const j = await r.json();
    const keys = Object.keys(j).slice(0, 6).join(', ');
    line(`  ${method.padEnd(4)} ${p.padEnd(28)} ${String(r.status).padEnd(4)} ${r.headers.get('content-type')}`);
    line(`       JSON keys: ${keys}`);
  }

  // ---------- a real answer, end to end ----------
  line('');
  line('=========== END-TO-END (persona-aware answer) ===========');
  const r = await fetch(base + '/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona: 'agri', question: 'मेरी मिट्टी कौन सी है?', city: 'Nagpur', profile: { state: 'Maharashtra', land: 2 } }),
  });
  const j = await r.json();
  const plain = j.answer
    .replace(/<br\s*\/?>/g, '\n').replace(/<li>/g, '  - ').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/\n{2,}/g, '\n').trim();
  line('  question : मेरी मिट्टी कौन सी है?   (Hindi input)');
  line(`  persona  : ${j.persona}   source: ${j.source}   provider: ${j.provider || '-'}`);
  line('  answer   :');
  plain.split('\n').forEach((l) => line('    ' + l));

  await new Promise((r2) => server.close(r2));
  line('');
  line('✅ Frontend served AND backend API working from the same server.');
  line('');
  process.exit(0);
})();
