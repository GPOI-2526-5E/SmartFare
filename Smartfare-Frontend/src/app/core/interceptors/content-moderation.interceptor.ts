import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

type ModerationCategory = 'hate' | 'sexual' | 'url' | 'violence' | 'drugs' | 'spam_url' | 'insults_it' | 'insults_en';

type ModerationIssue = {
  path: string;
  category: ModerationCategory;
};

const SKIPPED_KEYS = new Set([
  'password',
  'newPassword',
  'confirmPassword',
  'token',
  'code',
  'email',
  'idToken',
  'accessToken',
  'refreshToken',
  'avatarUrl',
  'backgroundImageUrl',
  'image',
  'imageUrl',
  'photo',
  'photoUrl',
  'picture',
  'thumbnail',
  'thumb',
  'cover',
  'coverImage',
  'logo',
  'icon',
  'instagramUrl',
  'twitterUrl',
  'returnUrl',
  'visibilityCode',
  'birthDate',
  'startDate',
  'endDate',
  'plannedStartAt',
  'plannedEndAt',
  'groupStartAt',
  'groupEndAt',
  'locationId',
  'activityId',
  'accommodationId',
  'dayNumber',
  'orderInt',
  'id',
  'mode'
]);

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
    const resp = await fetch('/public/moderation/tokens');
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

function shouldInspectKey(key: string | number | undefined): boolean {
  if (key === undefined || key === null) {
    return true;
  }

  return !SKIPPED_KEYS.has(String(key));
}

function normalizeText(value: string): string {
  return value.normalize('NFKC').trim();
}

function matchesWholeWord(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![\\w])${escaped}(?![\\w])`, 'i');
  return re.test(text);
}

function detectCategory(text: string): ModerationCategory | null {
  if (!text) return null;
  // If tokens not ready, do not block on client — backend will enforce
  if (!tokenStore.ready || !tokenStore.tokensMap || !tokenStore.tokensSorted) return null;

  const normalized = normalizeText(text);

  for (const token of tokenStore.tokensSorted) {
    // Only match whole words — "sonoCazzo54" will NOT be flagged for "cazzo"
    if (matchesWholeWord(normalized, token)) {
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


function collectIssues(value: unknown, path: Array<string | number> = [], key?: string | number): ModerationIssue[] {
  if (!shouldInspectKey(key)) {
    return [];
  }

  if (typeof value === 'string') {
    const category = detectCategory(value);
    return category ? [{ path: path.join('.'), category }] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectIssues(item, [...path, index], index));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([childKey, childValue]) =>
      collectIssues(childValue, [...path, childKey], childKey)
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