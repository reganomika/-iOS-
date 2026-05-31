// Автогенерация тестов (MCQ) по карточкам через OpenRouter (LLM-шлюз — как в Pennedly).
// Это BUILD-шаг: генерит один раз, кэширует в quizzes.js, в браузере LLM не вызывается.
//
// Запуск (ключ НЕ коммитить, передавать через env):
//   OPENROUTER_API_KEY=sk-or-... node platform/gen-quiz.mjs
// Опц.: QUIZ_MODEL=anthropic/claude-sonnet-4  QUIZ_PER_CARD=1  ONLY_DECK=Классы-и-структуры
//
// Идемпотентно: карточки, для которых тест уже есть в quizzes.js, пропускаются (можно прерывать/возобновлять).
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.QUIZ_MODEL || 'anthropic/claude-sonnet-4';
const PER_CARD = Number(process.env.QUIZ_PER_CARD || 1);
const ONLY_DECK = process.env.ONLY_DECK || null;

if (!KEY) {
  console.error('❌ Нет OPENROUTER_API_KEY. Запуск: OPENROUTER_API_KEY=sk-or-... node platform/gen-quiz.mjs');
  process.exit(1);
}

// --- читаем уже распарсенные карточки из cards.js ---
function readEmbedded(file, prop) {
  const txt = readFileSync(join(__dirname, file), 'utf8');
  const win = {};
  new Function('window', txt)(win);   // выполняем «window.X = …» с подменой window — надёжно для JS-литерала и JSON
  return win[prop];
}
const cards = readEmbedded('cards.js', 'CARDS');
let quizzes = {};
try { quizzes = readEmbedded('quizzes.js', 'QUIZZES') || {}; } catch { quizzes = {}; }

const SYSTEM = `Ты — методист, делаешь тестовые вопросы с вариантами для подготовки к собеседованиям iOS-разработчиков (senior).
Отвечай ТОЛЬКО валидным JSON без markdown-обёртки. Правила:
- Ровно ${PER_CARD} вопрос(а) на карточку, поле "q".
- 4 варианта в "options"; РОВНО один с "ok": true.
- Дистракторы — правдоподобные (основаны на типичных заблуждениях, особенно на "ловушке" карточки), не абсурдные.
- У каждого варианта "why" — короткое объяснение, почему он верен/неверен (для разбора ошибок).
- Язык — русский. Технические термины и код можно в backticks.`;

function userPrompt(c) {
  return `Карточка (тема «${c.topic}»):
Вопрос: ${c.title}
Ядро: ${c.core}
${c.why ? 'Почему: ' + c.why : ''}
${c.trap ? 'Ловушка (хороший источник дистракторов): ' + c.trap : ''}
${c.anchor ? 'Аналогия: ' + c.anchor : ''}

Верни JSON-массив такого вида:
[{"q":"...","options":[{"t":"...","ok":true,"why":"..."},{"t":"...","ok":false,"why":"..."},{"t":"...","ok":false,"why":"..."},{"t":"...","ok":false,"why":"..."}]}]`;
}

async function genFor(c) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userPrompt(c) }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  let txt = data.choices?.[0]?.message?.content?.trim() || '';
  txt = txt.replace(/^```(json)?/i, '').replace(/```$/, '').trim();   // снять возможную обёртку
  const arr = JSON.parse(txt.slice(txt.indexOf('['), txt.lastIndexOf(']') + 1));
  // валидация
  const clean = arr.filter(q => Array.isArray(q.options) && q.options.length === 4
    && q.options.filter(o => o.ok).length === 1 && q.options.every(o => o.t && typeof o.ok === 'boolean'));
  if (!clean.length) throw new Error('пустой/невалидный результат');
  return clean;
}

const todo = cards.filter(c => !quizzes[c.id] && (!ONLY_DECK || c.deck === ONLY_DECK));
console.log(`Карточек без теста: ${todo.length} (модель: ${MODEL}, по ${PER_CARD} на карточку)`);

let ok = 0, fail = 0;
for (const c of todo) {
  try {
    quizzes[c.id] = await genFor(c);
    ok++;
    process.stdout.write(`  ✓ ${c.id}\n`);
    writeFileSync(join(__dirname, 'quizzes.js'), serialize(quizzes), 'utf8'); // пишем после каждой — устойчиво к прерыванию
  } catch (e) {
    fail++;
    process.stdout.write(`  ✗ ${c.id}: ${e.message}\n`);
  }
}

function serialize(obj) {
  const banner = `// Тесты (MCQ). Авторские для «Классы и структуры», остальное — gen-quiz.mjs (OpenRouter).\n// Перегенерировать недостающие: OPENROUTER_API_KEY=... node platform/gen-quiz.mjs\n`;
  return `${banner}window.QUIZZES = ${JSON.stringify(obj, null, 2)};\n`;
}

console.log(`Готово: +${ok}, ошибок ${fail}. Всего тестов: ${Object.keys(quizzes).length}. Проверь quizzes.js перед коммитом.`);
