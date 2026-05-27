import fs from 'fs';
import path from 'path';

type TokensJson = Record<string, any>;

const TOKENS_PATH = path.join(process.cwd(), 'src', 'services', 'moderation', 'moderation-tokens.json');

let tokensCache: TokensJson | null = null;
let simpleTokenMap: Map<string, string[]> | null = null;

function loadTokensFile(): TokensJson {
  if (tokensCache) return tokensCache;
  const raw = fs.readFileSync(TOKENS_PATH, 'utf8');
  tokensCache = JSON.parse(raw) as TokensJson;
  return tokensCache;
}

function buildIndex() {
  const json = loadTokensFile();
  simpleTokenMap = new Map();
  for (const [category, list] of Object.entries(json)) {
    if (category === '_meta' || category === 'regex_patterns') continue;
    if (!Array.isArray(list)) continue;
    for (const t of list) {
      const lower = String(t).toLowerCase();
      const arr = simpleTokenMap.get(lower) || [];
      arr.push(category);
      simpleTokenMap.set(lower, arr);
    }
  }
}

function normalizeText(s: string): string {
  // NFKC + remove diacritics
  return s.normalize('NFKC').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function detectTextIssues(text: string) {
  if (!simpleTokenMap) buildIndex();
  const map = simpleTokenMap!;
  const normalized = normalizeText(text);

  const matches: Array<{ token: string; categories: string[]; index: number }> = [];

  // Simple but effective: iterate tokens sorted by length (longer first)
  const tokens = Array.from(map.keys()).sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    const idx = normalized.indexOf(token);
    if (idx >= 0) {
      matches.push({ token, categories: map.get(token) || [], index: idx });
    }
  }

  // regex patterns
  const json = loadTokensFile();
  const regexes: string[] = Array.isArray(json.regex_patterns) ? json.regex_patterns : [];
  for (const r of regexes) {
    try {
      const re = new RegExp(r, 'i');
      const m = re.exec(text);
      if (m) {
        matches.push({ token: r, categories: ['spam_url'], index: m.index });
      }
    } catch (e) {
      // ignore invalid regex
    }
  }

  return matches;
}

export function reloadTokens() {
  tokensCache = null;
  simpleTokenMap = null;
  return loadTokensFile();
}

export default { detectTextIssues, reloadTokens };
