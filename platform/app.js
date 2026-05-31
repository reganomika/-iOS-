'use strict';
/* Тренажёр конспекта — статический SPA. Данные: window.CARDS (из cards.js). */

const CARDS = (window.CARDS || []).slice().sort((a, b) => a.deck.localeCompare(b.deck) || a.q - b.q);
const BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));

const PROMPT_LABEL = { tell: '🗣 Расскажи', list: '📋 Перечисли', compare: '⚖️ Сравни', reason: '🤔 Разбери' };
const LEVEL_LABEL = { easy: '🟢 База', medium: '🟠 Средне', hard: '🔴 Сложно' };

const DAY = 86400000;
const INTERVALS = [0, 1, 2, 4, 8, 16, 32];   // дни по «коробкам» Leitner
const LEARNED_BOX = 3;
const SESSION_LIMIT = 40;

/* ---------- прогресс (localStorage) ---------- */
const PKEY = 'trainer.progress.v1';
let progress = load();
function load() { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch { return {}; } }
function save() { localStorage.setItem(PKEY, JSON.stringify(progress)); }
const now = () => Date.now();
const isNew = id => !progress[id];
const isDue = id => !progress[id] || progress[id].due <= now();
const learnedCount = () => CARDS.filter(c => (progress[c.id]?.box ?? 0) >= LEARNED_BOX).length;

function dueQueue() {
  const due = CARDS.filter(c => progress[c.id] && progress[c.id].due <= now())
    .sort((a, b) => progress[a.id].due - progress[b.id].due);
  const fresh = CARDS.filter(c => isNew(c.id));
  return [...due, ...fresh].slice(0, SESSION_LIMIT).map(c => c.id);
}
function decks() {
  const m = new Map();
  for (const c of CARDS) {
    if (!m.has(c.deck)) m.set(c.deck, { deck: c.deck, topic: c.topic, cards: [] });
    m.get(c.deck).cards.push(c);
  }
  return [...m.values()];
}

/* ---------- мини-markdown (с экранированием) ---------- */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inlineMd(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
function blockMd(text) {
  const parts = String(text).split('```');
  let html = '';
  parts.forEach((p, i) => {
    if (i % 2 === 1) {
      const nl = p.indexOf('\n');
      const code = nl >= 0 ? p.slice(nl + 1) : p;
      html += '<pre><code>' + esc(code.replace(/\n$/, '')) + '</code></pre>';
    } else {
      p.split(/\n{2,}/).forEach(block => {
        block = block.trim();
        if (!block) return;
        if (/^[-*] /m.test(block)) {
          const items = block.split('\n').filter(l => /^[-*] /.test(l))
            .map(l => '<li>' + inlineMd(l.replace(/^[-*] /, '')) + '</li>').join('');
          html += '<ul>' + items + '</ul>';
        } else {
          html += '<p>' + inlineMd(block).replace(/\n/g, '<br>') + '</p>';
        }
      });
    }
  });
  return html;
}

/* ---------- состояние ---------- */
let S = { view: 'home', queue: [], idx: 0, revealed: false, deepOpen: false, stat: null };

function startStudy(ids) {
  if (!ids.length) return;
  S = { view: 'study', queue: ids, idx: 0, revealed: false, deepOpen: false, stat: { again: 0, hard: 0, good: 0, n: 0 } };
  render();
}
function reveal() { S.revealed = true; render(); }
function rate(grade) {
  if (!S.revealed) return;
  const id = S.queue[S.idx];
  const p = progress[id] || { box: 0, seen: 0 };
  if (grade === 'again') { p.box = 0; p.due = now(); S.queue.push(id); S.stat.again++; }
  else if (grade === 'hard') { p.due = now() + DAY; S.stat.hard++; }
  else { p.box = Math.min(p.box + 1, INTERVALS.length - 1); p.due = now() + INTERVALS[p.box] * DAY; S.stat.good++; }
  p.seen = (p.seen || 0) + 1; p.last = now();
  progress[id] = p; save();
  S.stat.n++;
  S.idx++; S.revealed = false; S.deepOpen = false;
  if (S.idx >= S.queue.length) S.view = 'done';
  render();
}
function goHome() { S = { view: 'home', queue: [], idx: 0, revealed: false, deepOpen: false, stat: null }; render(); }

/* ---------- рендер ---------- */
const app = document.getElementById('app');
const topStats = document.getElementById('topStats');

function render() {
  topStats.textContent = `Выучено ${learnedCount()} / ${CARDS.length}`;
  if (!CARDS.length) { app.innerHTML = `<p class="muted">Нет карточек. Запусти <code>node platform/parse.mjs</code>.</p>`; return; }
  if (S.view === 'home') renderHome();
  else if (S.view === 'study') renderStudy();
  else renderDone();
  window.scrollTo(0, 0);
}

function renderHome() {
  const due = dueQueue().length;
  const ds = decks();
  app.innerHTML = `
    <div class="hero">
      <div class="statline">
        <div class="stat"><div class="num">${due}</div><div class="lbl">к повторению сегодня</div></div>
        <div class="stat"><div class="num">${learnedCount()}</div><div class="lbl">выучено карточек</div></div>
        <div class="stat"><div class="num">${ds.length}</div><div class="lbl">тем в конспекте</div></div>
      </div>
      <button class="primary big-cta" id="studyToday" ${due ? '' : 'disabled'}>
        ${due ? `▶ Учить сегодня (${due})` : '✓ На сегодня всё — выбери тему ниже'}
      </button>
    </div>
    <div class="section-title">Темы</div>
    ${ds.map(d => {
      const total = d.cards.length;
      const learned = d.cards.filter(c => (progress[c.id]?.box ?? 0) >= LEARNED_BOX).length;
      const pct = Math.round(learned / total * 100);
      return `<button class="deck" data-deck="${esc(d.deck)}">
        <div class="d-main">
          <div class="d-title">${esc(d.topic)}</div>
          <div class="d-sub">${total} карточек · выучено ${learned}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
        </div>
        <div class="d-chev">›</div>
      </button>`;
    }).join('')}
  `;
  const today = document.getElementById('studyToday');
  if (due) today.onclick = () => startStudy(dueQueue());
  app.querySelectorAll('.deck').forEach(el => {
    el.onclick = () => startStudy(decks().find(d => d.deck === el.dataset.deck).cards.map(c => c.id));
  });
}

function renderStudy() {
  const c = BY_ID[S.queue[S.idx]];
  const pct = Math.round(S.idx / S.queue.length * 100);
  const revealed = S.revealed;

  const fu = c.followup ? `<div class="block followup"><span class="lab">⚡ А ЕСЛИ СПРОСЯТ</span>
      <div class="qq">${inlineMd(c.followup.q)}</div><div class="aa">→ ${inlineMd(c.followup.a)}</div></div>` : '';

  const hidden = !revealed ? '' : `
    ${c.why ? `<div class="block"><span class="lab">🔑 ПОЧЕМУ</span>${inlineMd(c.why)}</div>` : ''}
    ${c.trap ? `<div class="block trap"><span class="lab">⚠️ ЛОВУШКА</span>${inlineMd(c.trap)}</div>` : ''}
    ${c.anchor ? `<div class="block anchor"><span class="lab">🧠 ЯКОРЬ</span>${inlineMd(c.anchor)}</div>` : ''}
    ${c.phrase ? `<div class="block phrase"><span class="lab">💬 СКАЗАТЬ ВСЛУХ</span>«${inlineMd(c.phrase)}»</div>` : ''}
    ${fu}
    ${c.deep ? `<div class="hidden-wrap"><button class="toggle-more" id="deepBtn">${S.deepOpen ? '▾ Скрыть код и детали' : '▸ Глубже + код'}</button>
        ${S.deepOpen ? `<div class="deep">${blockMd(c.deep)}</div>` : ''}</div>` : ''}
  `;

  app.innerHTML = `
    <div class="progress-top"><span>${S.idx + 1} / ${S.queue.length}</span><div class="bar"><i style="width:${pct}%"></i></div></div>
    <div class="qcard">
      <div class="badges">
        <span class="badge lvl-${c.level}">${LEVEL_LABEL[c.level] || ''}</span>
        <span class="badge">${PROMPT_LABEL[c.promptType] || ''}</span>
        <span class="badge">${esc(c.topic)}</span>
      </div>
      <div class="q-title">${inlineMd(c.title)}</div>
      ${c.cue ? `<div class="q-cue">${inlineMd(c.cue)}</div>` : ''}
      <div class="block core"><span class="lab">🎯 ЯДРО</span>${inlineMd(c.core)}</div>
      ${hidden}
    </div>
    <div class="actions">
      ${revealed ? `
        <div class="rate">
          <button class="again" data-g="again">Не знаю</button>
          <button class="hard" data-g="hard">Шатко</button>
          <button class="good" data-g="good">Знаю</button>
        </div>
        <div class="kbd-hint">1 — не знаю · 2 — шатко · 3 — знаю · D — детали</div>
      ` : `
        <button class="primary reveal-btn" id="revealBtn">Проверить себя (Пробел)</button>
        <div class="kbd-hint">сначала ответь сам — вслух или мысленно</div>
      `}
    </div>
  `;
  if (!revealed) document.getElementById('revealBtn').onclick = reveal;
  else {
    app.querySelectorAll('.rate button').forEach(b => b.onclick = () => rate(b.dataset.g));
    const db = document.getElementById('deepBtn');
    if (db) db.onclick = () => { S.deepOpen = !S.deepOpen; render(); };
  }
}

function renderDone() {
  const s = S.stat;
  app.innerHTML = `
    <div class="done">
      <div class="em">🎉</div>
      <h2>Сессия завершена</h2>
      <p>Повторено карточек: <b>${s.n}</b><br>
         знаю ${s.good} · шатко ${s.hard} · не знаю ${s.again}</p>
      <div class="btn-row" style="justify-content:center;margin-top:18px">
        <button class="primary" id="againBtn">Ещё круг</button>
        <button id="homeBack">На главную</button>
      </div>
    </div>`;
  document.getElementById('homeBack').onclick = goHome;
  document.getElementById('againBtn').onclick = () => { const q = dueQueue(); q.length ? startStudy(q) : goHome(); };
}

/* ---------- клавиатура ---------- */
document.addEventListener('keydown', e => {
  if (S.view !== 'study') return;
  if (e.key === ' ') { e.preventDefault(); if (!S.revealed) reveal(); }
  else if (S.revealed && (e.key === '1' || e.key === '2' || e.key === '3')) rate({ '1': 'again', '2': 'hard', '3': 'good' }[e.key]);
  else if (e.key.toLowerCase() === 'd' && S.revealed && BY_ID[S.queue[S.idx]].deep) { S.deepOpen = !S.deepOpen; render(); }
  else if (e.key === 'Escape') goHome();
});
document.getElementById('homeBtn').onclick = goHome;

render();
