'use strict';
/* Тренажёр конспекта — статический SPA. Данные: window.CARDS (из cards.js). */

const CARDS = (window.CARDS || []).slice().sort((a, b) => a.deck.localeCompare(b.deck) || a.q - b.q);
const BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
const QUIZZES = window.QUIZZES || {};

// Все MCQ темы (в порядке карточек), с привязкой к карточке для контекста
function quizFor(deck) {
  const out = [];
  for (const c of CARDS.filter(x => x.deck === deck)) {
    for (const mcq of (QUIZZES[c.id] || [])) out.push({ ...mcq, cardId: c.id, cardTitle: c.title });
  }
  return out;
}
const deckHasQuiz = deck => quizFor(deck).length > 0;

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

function startStudy(ids, deck = null) {
  if (!ids.length) return;
  S = { view: 'study', deck, queue: ids, idx: 0, revealed: false, deepOpen: false, stat: { again: 0, hard: 0, good: 0, n: 0 } };
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
  else if (S.view === 'quiz') renderQuiz();
  else if (S.view === 'quizDone') renderQuizDone();
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
      const hasQuiz = deckHasQuiz(d.deck);
      return `<div class="deck">
        <button class="d-study" data-deck="${esc(d.deck)}">
          <div class="d-main">
            <div class="d-title">${esc(d.topic)}</div>
            <div class="d-sub">${total} карточек · выучено ${learned}${hasQuiz ? ` · тест: ${quizFor(d.deck).length}` : ''}</div>
            <div class="bar"><i style="width:${pct}%"></i></div>
          </div>
        </button>
        ${hasQuiz ? `<button class="d-test" data-deck="${esc(d.deck)}" title="Тест по теме">🧪</button>` : '<div class="d-chev">›</div>'}
      </div>`;
    }).join('')}
  `;
  const today = document.getElementById('studyToday');
  if (due) today.onclick = () => startStudy(dueQueue());
  app.querySelectorAll('.d-study').forEach(el => {
    el.onclick = () => startStudy(decks().find(d => d.deck === el.dataset.deck).cards.map(c => c.id), el.dataset.deck);
  });
  app.querySelectorAll('.d-test').forEach(el => {
    const d = decks().find(x => x.deck === el.dataset.deck);
    el.onclick = () => startQuiz(quizFor(el.dataset.deck), d.topic);
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
  const deck = S.deck;
  const canTest = deck && deckHasQuiz(deck);
  app.innerHTML = `
    <div class="done">
      <div class="em">🎉</div>
      <h2>Обучение пройдено</h2>
      <p>Повторено карточек: <b>${s.n}</b><br>
         знаю ${s.good} · шатко ${s.hard} · не знаю ${s.again}</p>
      <div class="btn-row" style="justify-content:center;margin-top:18px">
        ${canTest ? `<button class="primary" id="toTest">🧪 Закрепить тестом</button>` : `<button class="primary" id="againBtn">Ещё круг</button>`}
        <button id="homeBack">На главную</button>
      </div>
      ${canTest ? `<div class="kbd-hint" style="margin-top:14px">${quizFor(deck).length} вопросов с вариантами ответов и разбором</div>` : ''}
    </div>`;
  document.getElementById('homeBack').onclick = goHome;
  if (canTest) document.getElementById('toTest').onclick = () => startQuiz(quizFor(deck), decks().find(d => d.deck === deck).topic);
  else document.getElementById('againBtn').onclick = () => { const q = dueQueue(); q.length ? startStudy(q) : goHome(); };
}

/* ---------- тест (MCQ) ---------- */
function startQuiz(list, title) {
  if (!list || !list.length) return;
  S = { view: 'quiz', quiz: { list, title, idx: 0, picked: null, score: 0 } };
  render();
}
function pickAnswer(i) {
  const q = S.quiz;
  if (q.picked !== null) return;
  q.picked = i;
  if (q.list[q.idx].options[i].ok) q.score++;
  render();
}
function nextQuiz() {
  const q = S.quiz;
  q.idx++; q.picked = null;
  if (q.idx >= q.list.length) S.view = 'quizDone';
  render();
}
function renderQuiz() {
  const q = S.quiz;
  const item = q.list[q.idx];
  const answered = q.picked !== null;
  const pct = Math.round(q.idx / q.list.length * 100);
  const opts = item.options.map((o, i) => {
    let cls = 'opt';
    if (answered) cls += o.ok ? ' ok' : (i === q.picked ? ' bad' : ' dim');
    return `<button class="${cls}" data-i="${i}" ${answered ? 'disabled' : ''}>
        <span class="opt-letter">${'ABCD'[i] || (i + 1)}</span>
        <span class="opt-text">${inlineMd(o.t)}</span>
        ${answered ? `<span class="opt-mark">${o.ok ? '✓' : (i === q.picked ? '✗' : '')}</span>` : ''}
      </button>${answered ? `<div class="opt-why ${o.ok ? 'ok' : (i === q.picked ? 'bad' : '')}">${inlineMd(o.why)}</div>` : ''}`;
  }).join('');
  app.innerHTML = `
    <div class="progress-top"><span>Тест ${q.idx + 1} / ${q.list.length}</span><div class="bar"><i style="width:${pct}%"></i></div><span>${q.score} ✓</span></div>
    <div class="qcard">
      <div class="badges"><span class="badge">🧪 ${esc(q.title)}</span><span class="badge">${esc(item.cardTitle)}</span></div>
      <div class="q-title quiz-q">${inlineMd(item.q)}</div>
      <div class="opts">${opts}</div>
    </div>
    <div class="actions">
      ${answered
        ? `<button class="primary reveal-btn" id="nextQ">${q.idx + 1 >= q.list.length ? 'Завершить тест' : 'Дальше →'}</button>`
        : `<div class="kbd-hint">выбери вариант — покажу разбор каждого · клавиши 1–${item.options.length}</div>`}
    </div>`;
  if (!answered) app.querySelectorAll('.opt').forEach(b => b.onclick = () => pickAnswer(+b.dataset.i));
  else document.getElementById('nextQ').onclick = nextQuiz;
}
function renderQuizDone() {
  const q = S.quiz;
  const pct = Math.round(q.score / q.list.length * 100);
  const em = pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚';
  const msg = pct >= 80 ? 'Отлично — материал закреплён!' : pct >= 50 ? 'Неплохо, но есть пробелы.' : 'Стоит вернуться к обучению.';
  app.innerHTML = `
    <div class="done">
      <div class="em">${em}</div>
      <h2>${q.score} / ${q.list.length} верно</h2>
      <p>${msg}</p>
      <div class="btn-row" style="justify-content:center;margin-top:18px">
        <button class="primary" id="retryQuiz">Пройти ещё раз</button>
        <button id="homeBack2">На главную</button>
      </div>
    </div>`;
  document.getElementById('retryQuiz').onclick = () => startQuiz(q.list, q.title);
  document.getElementById('homeBack2').onclick = goHome;
}

/* ---------- клавиатура ---------- */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { goHome(); return; }
  if (S.view === 'study') {
    if (e.key === ' ') { e.preventDefault(); if (!S.revealed) reveal(); }
    else if (S.revealed && (e.key === '1' || e.key === '2' || e.key === '3')) rate({ '1': 'again', '2': 'hard', '3': 'good' }[e.key]);
    else if (e.key.toLowerCase() === 'd' && S.revealed && BY_ID[S.queue[S.idx]].deep) { S.deepOpen = !S.deepOpen; render(); }
  } else if (S.view === 'quiz') {
    const q = S.quiz;
    if (q.picked === null) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= q.list[q.idx].options.length) pickAnswer(n - 1);
    } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextQuiz(); }
  }
});
document.getElementById('homeBtn').onclick = goHome;

render();
