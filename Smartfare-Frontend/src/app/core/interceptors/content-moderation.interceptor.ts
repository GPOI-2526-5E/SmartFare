import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

type ModerationCategory = 'hate' | 'sexual' | 'url' | 'violence' | 'drugs' | 'spam_url' | 'insults_it' | 'insults_en';

type ModerationIssue = {
  path: string;
  category: ModerationCategory;
};

const MODERATED_KEYS = new Set([
  'bio',
  'note',
  'notes',
  'description',
  'title',
  'groupName',
  'comment',
  'message',
  'text',
  'content',
  'review',
  'about',
  'prompt',
  'style',
  'pace',
  'interests',
  'name',
  'surname',
  'firstName',
  'lastName',
  'itineraryDescription'
]);

function isModeratedPath(path: Array<string | number>): boolean {
  for (const seg of path) {
    if (typeof seg === 'string' && MODERATED_KEYS.has(seg)) {
      return true;
    }
  }
  return false;
}

// Token store loaded from backend: /public/moderation/tokens
const tokenStore: {
  ready: boolean;
  tokensMap: Map<string, string[]> | null;
  tokensSorted: string[] | null;
  regexes: RegExp[] | null;
} = {
  ready: false,
  tokensMap: null,
  tokensSorted: null,
  regexes: null
};

async function initTokens() {
  try {
    const resp = await fetch(`${environment.apiUrl}/public/moderation/tokens`);
    if (!resp.ok) return;
    const json = await resp.json();
    const map = new Map<string, string[]>();
    for (const [k, v] of Object.entries(json)) {
      if (k === '_meta' || k === 'regex_patterns') continue;
      if (!Array.isArray(v)) continue;
      for (const t of v) {
        const lower = String(t).toLowerCase();
        const arr = map.get(lower) || [];
        arr.push(k);
        map.set(lower, arr);
      }
    }
    const tokensSorted = Array.from(map.keys()).sort((a, b) => b.length - a.length);
    const regexes: RegExp[] = [];
    if (Array.isArray(json.regex_patterns)) {
      for (const r of json.regex_patterns) {
        try {
          regexes.push(new RegExp(r, 'i'));
        } catch (e) {
          // ignore invalid
        }
      }
    }
    tokenStore.tokensMap = map;
    tokenStore.tokensSorted = tokensSorted;
    tokenStore.regexes = regexes;
    tokenStore.ready = true;
  } catch (e) {
    // network error — tokenStore remains not ready; backend will enforce rules
    console.warn('Failed to load moderation tokens', e);
  }
}

// kick off async load (fire-and-forget)
void initTokens();



function normalizeText(value: string): string {
  return value.normalize('NFKC').trim();
}

function detectCategory(text: string): ModerationCategory | null {
  if (!text) return null;
  // If tokens not ready, do not block on client — backend will enforce
  if (!tokenStore.ready || !tokenStore.tokensMap || !tokenStore.tokensSorted) return null;

  const normalized = normalizeText(text);
  const lower = normalized.toLowerCase();

  for (const token of tokenStore.tokensSorted) {
    if (lower.includes(token)) {
      const cats = tokenStore.tokensMap!.get(token) || [];
      const cat = cats[0];
      switch (cat) {
        case 'hate': return 'hate';
        case 'sexual': return 'sexual';
        case 'violence': return 'violence';
        case 'drugs': return 'drugs';
        case 'spam_url': return 'spam_url';
        case 'insults_it': return 'insults_it';
        case 'insults_en': return 'insults_en';
        default: return 'hate';
      }
    }
  }

  if (tokenStore.regexes && tokenStore.regexes.some((r) => r.test(text))) return 'spam_url';

  return null;
}

function collectIssues(value: unknown, path: Array<string | number> = []): ModerationIssue[] {
  if (typeof value === 'string') {
    if (isModeratedPath(path)) {
      const category = detectCategory(value);
      return category ? [{ path: path.join('.'), category }] : [];
    }
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectIssues(item, [...path, index]));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([childKey, childValue]) =>
      collectIssues(childValue, [...path, childKey])
    );
  }

  return [];
}

function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiUrl) || url.startsWith('/api/') || url.startsWith('/auth/');
}

export const contentModerationInterceptor: HttpInterceptorFn = (req, next) => {
  const method = req.method.toUpperCase();

  if (!['POST', 'PUT', 'PATCH'].includes(method) || !isApiRequest(req.url)) {
    return next(req);
  }

  if (!req.body || typeof req.body !== 'object' || req.body instanceof FormData) {
    return next(req);
  }

  const issues = collectIssues(req.body);

  if (issues.length === 0) {
    return next(req);
  }

  const [firstIssue] = issues;
  const categoryMessages: Record<ModerationCategory, string> = {
    hate: 'contenuto d\'odio o discriminatorio',
    sexual: 'contenuto sessuale o pornografico',
    url: 'URL o sito non consentito',
    violence: 'contenuto violento o pericoloso',
    drugs: 'contenuto relativo a droghe non consentito',
    spam_url: 'URL o contenuto promozionale non consentito',
    insults_it: 'insulto non consentito',
    insults_en: 'insult (EN) non consentito'
  };

  const message = `Campo "${firstIssue.path}" non consentito: ${categoryMessages[firstIssue.category]}`;

  return throwError(() => new HttpErrorResponse({
    status: 400,
    statusText: 'Bad Request',
    error: {
      error: message,
      details: {
        field: firstIssue.path,
        category: firstIssue.category,
        reason: categoryMessages[firstIssue.category],
        issues
      }
    }
  }));
};