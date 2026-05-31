// Парсер v4-markdown → cards.js (window.CARDS).
// Читает все *.md в корне репозитория, вытаскивает карточки формата v4.
// Старые (не-v4) файлы просто дают 0 карточек и игнорируются.
//
// Запуск:  node platform/parse.mjs
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- код-поинты эмодзи (без вариативных селекторов) ---
const LEVEL = { '\u{1F7E2}': 'easy', '\u{1F7E0}': 'medium', '\u{1F534}': 'hard' };       // 🟢🟠🔴
const PROMPT = { '\u{1F5E3}': 'tell', '\u{1F4CB}': 'list', '\u{2696}': 'compare', '\u{1F914}': 'reason' }; // 🗣📋⚖️🤔

// Достаёт содержимое блока по жирному лейблу: **Лейбл.** ... (до пустой строки / details / конца)
function field(text, label) {
  const re = new RegExp('\\*\\*' + label + '[^*]*\\*\\*[\\s—:.\\-]*([\\s\\S]+?)(?=\\n\\n|<\\/?details|$)');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function slugify(name) {
  return name.replace(/\.md$/, '').replace(/[,\s]+/g, '-');
}

function parseCard(seg, deck, topic) {
  const titleM = seg.match(/^##\s+Q(\d+)\s*[·•]\s*(.+)$/m);
  if (!titleM) return null;
  const num = titleM[1];
  const rest = titleM[2];

  const cps = [...rest];
  let level = '';
  for (const c of cps) if (LEVEL[c]) level = LEVEL[c];
  const title = rest
    .replaceAll('&nbsp;', '')
    .replace(/[\u{1F7E2}\u{1F7E0}\u{1F534}]/gu, '')
    .trim();

  // Строка-подсказка идёт сразу под заголовком
  const lines = seg.split('\n');
  const titleIdx = lines.findIndex(l => /^##\s+Q\d+/.test(l));
  let promptType = 'tell', cue = '';
  for (let i = titleIdx + 1; i < lines.length && i <= titleIdx + 3; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    const first = [...l][0];
    if (PROMPT[first]) {
      promptType = PROMPT[first];
      cue = l.replace(/^\S+\s*/, '').replace(/^\*/, '').replace(/\*$/, '').trim();
    }
    break;
  }

  let followup = null;
  const fu = field(seg, 'А если спросят');
  if (fu) {
    const parts = fu.split('→'); // →
    followup = {
      q: (parts[0] || '').replace(/[«»"]/g, '').trim(),
      a: parts.slice(1).join('→').trim(),
    };
  }

  const deepM = seg.match(/<summary>[^<]*Глубже[^<]*<\/summary>([\s\S]*?)<\/details>/);
  const deep = deepM ? deepM[1].trim() : '';

  // Источники часто в конце deep: строка с *Источник(и):*
  let sources = '';
  const srcM = deep.match(/\*Источник[^*]*\*\s*([\s\S]*?)$/);
  if (srcM) sources = srcM[1].trim();

  return {
    id: `${deck}-q${num}`,
    q: Number(num),
    deck, topic, title, level, promptType, cue,
    core: field(seg, 'Ядро'),
    why: field(seg, 'Почему'),
    trap: field(seg, 'Ловушка'),
    anchor: field(seg, 'Якорь'),
    phrase: field(seg, 'Вслух').replace(/[«»]/g, '').trim(),
    followup,
    deep,
    sources,
  };
}

function parseFile(file) {
  const raw = readFileSync(join(ROOT, file), 'utf8');
  const topicM = raw.match(/^#\s+(.+)$/m);
  const topic = topicM ? topicM[1].trim() : slugify(file);
  const deck = slugify(file);
  const segments = raw.split(/^---\s*$/m);
  const cards = [];
  for (const seg of segments) {
    if (!/^##\s+Q\d+/m.test(seg)) continue;
    const card = parseCard(seg, deck, topic);
    if (card && card.core) cards.push(card);
  }
  return { topic, count: cards.length, cards };
}

const files = readdirSync(ROOT).filter(f => f.endsWith('.md'));
const all = [];
const report = [];
for (const f of files) {
  const { topic, count, cards } = parseFile(f);
  if (count > 0) report.push(`  ${count.toString().padStart(3)} ← ${f}`);
  all.push(...cards);
}

const banner = `// АВТОГЕНЕРАЦИЯ — не редактировать руками. Источник: *.md (формат v4).\n// Перегенерировать: node platform/parse.mjs\n`;
writeFileSync(join(__dirname, 'cards.js'), `${banner}window.CARDS = ${JSON.stringify(all, null, 2)};\n`, 'utf8');

console.log(`Карточек собрано: ${all.length}`);
console.log(report.join('\n') || '  (v4-файлов не найдено)');
console.log(`→ ${join('platform', 'cards.js')}`);
