const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const srv = http.createServer(app);
const io = new Server(srv);
app.use(express.static(__dirname + '/public'));
app.get('/host', (q, r) => r.sendFile(__dirname + '/public/index.html'));
app.get('/health', (q, r) => r.send('ok'));

const rooms = {};
const rid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const newPin = () => { let p; do p = String(100000 + Math.floor(Math.random() * 900000)); while (rooms[p]); return p; };
const players = r => Object.values(r.players);
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

function ranked(r) { return players(r).sort((a, b) => b.score - a.score); }

function view(r, p) {
  const v = { phase: r.phase, pin: r.pin, n: players(r).length, names: players(r).map(x => x.name) };
  if (r.phase === 'question' || r.phase === 'results') {
    const q = r.questions[r.idx];
    v.q = { idx: r.idx, total: r.questions.length, text: q.text, options: q.options, seconds: q.seconds, multi: q.correct.length > 1,
            left: Math.max(0, r.endsAt - Date.now()) };
    v.answered = players(r).filter(x => x.ans).length;
  }
  if (r.phase === 'results') {
    const q = r.questions[r.idx];
    const counts = q.options.map(() => 0);
    players(r).forEach(x => { if (x.ans) x.ans.c.forEach(i => counts[i]++); });
    v.res = { counts, correct: q.correct, exact: players(r).filter(x => x.ans && same(x.ans.c, q.correct)).length, last: r.idx >= r.questions.length - 1 };
  }
  if (r.phase === 'results' || r.phase === 'end')
    v.board = ranked(r).slice(0, r.phase === 'end' ? 10 : 5).map(x => ({ name: x.name, score: x.score }));
  if (p) v.me = { name: p.name, chosen: p.ans ? p.ans.c : null, gain: p.gain || 0, score: p.score,
                  rank: ranked(r).indexOf(p) + 1, of: players(r).length };
  return v;
}

function broadcast(r) {
  io.to(r.hostSid).emit('state', view(r));
  players(r).forEach(p => p.sid && io.to(p.sid).emit('state', view(r, p)));
}

function start(r) {
  r.idx++;
  const q = r.questions[r.idx];
  r.phase = 'question';
  r.startedAt = Date.now();
  r.endsAt = r.startedAt + q.seconds * 1000;
  players(r).forEach(p => { p.ans = null; p.gain = 0; });
  clearTimeout(r.timer);
  r.timer = setTimeout(() => finish(r), q.seconds * 1000 + 300);
  broadcast(r);
}

function finish(r) {
  if (r.phase !== 'question') return;
  clearTimeout(r.timer);
  const q = r.questions[r.idx];
  r.phase = 'results';
  players(r).forEach(p => {
    p.gain = 0;
    if (p.ans && same(p.ans.c, q.correct)) {
      p.gain = Math.round(800 + 200 * Math.max(0, 1 - p.ans.t / (q.seconds * 1000)));
      p.score += p.gain;
    }
  });
  broadcast(r);
}

io.on('connection', s => {
  const hostRoom = () => Object.values(rooms).find(r => r.hostSid === s.id);

  s.on('host:create', ({ questions, password }, cb) => {
    if (process.env.LEHRER_PASSWORT && password !== process.env.LEHRER_PASSWORT)
      return cb({ error: 'Falsches Lehrer-Passwort.' });
    if (!Array.isArray(questions) || !questions.length) return cb({ error: 'Keine Fragen gefunden.' });
    questions.forEach(q => { q.correct = [...new Set([].concat(q.correct))].sort((a, b) => a - b); });
    const r = { pin: newPin(), hostToken: rid(), hostSid: s.id, questions, idx: -1, phase: 'lobby', players: {}, created: Date.now() };
    rooms[r.pin] = r;
    cb({ pin: r.pin, token: r.hostToken, view: view(r) });
  });

  s.on('host:resume', ({ pin, token }, cb) => {
    const r = rooms[pin];
    if (!r || r.hostToken !== token) return cb({ error: true });
    r.hostSid = s.id;
    cb({ view: view(r) });
  });

  s.on('host:next', () => {
    const r = hostRoom(); if (!r) return;
    if (r.phase === 'lobby' || r.phase === 'results') {
      if (r.idx + 1 < r.questions.length) start(r);
      else { r.phase = 'end'; broadcast(r); setTimeout(() => { delete rooms[r.pin]; }, 90000); }
    }
  });

  s.on('host:close', cb => {
    const r = hostRoom();
    if (r) { clearTimeout(r.timer); players(r).forEach(p => p.sid && io.to(p.sid).emit('closed')); delete rooms[r.pin]; }
    if (typeof cb === 'function') cb();
  });

  s.on('host:end', () => { const r = hostRoom(); if (r) finish(r); });

  s.on('player:join', ({ pin, name, token }, cb) => {
    const r = rooms[String(pin || '').trim()];
    if (!r) return cb({ error: 'Diese PIN gibt es nicht. Bitte prüfen Sie die Zahl auf der Leinwand.' });
    let p = r.players[token];
    if (!p) {
      name = String(name || '').trim().slice(0, 20);
      if (!name) return cb({ error: 'Bitte geben Sie einen Namen ein.' });
      if (players(r).some(x => x.name.toLowerCase() === name.toLowerCase()))
        return cb({ error: 'Dieser Name ist schon vergeben.' });
      p = r.players[token] = { name, score: 0, gain: 0, ans: null };
    }
    p.sid = s.id;
    cb({ view: view(r, p), name: p.name });
    io.to(r.hostSid).emit('state', view(r));
  });

  s.on('player:answer', c => {
    for (const r of Object.values(rooms)) {
      const p = players(r).find(x => x.sid === s.id);
      if (!p) continue;
      const q = r.questions[r.idx];
      if (r.phase !== 'question' || p.ans || !q) return;
      c = [...new Set([].concat(c))].filter(i => Number.isInteger(i) && i >= 0 && i < q.options.length).sort((a, b) => a - b);
      if (!c.length) return;
      p.ans = { c, t: Date.now() - r.startedAt };
      s.emit('state', view(r, p));
      io.to(r.hostSid).emit('state', view(r));
      if (players(r).every(x => x.ans)) finish(r);
      return;
    }
  });
});

setInterval(() => { for (const k in rooms) if (Date.now() - rooms[k].created > 8 * 3600e3) delete rooms[k]; }, 600e3);
srv.listen(process.env.PORT || 3000, () => console.log('Klassenblitz läuft auf Port ' + (process.env.PORT || 3000)));
