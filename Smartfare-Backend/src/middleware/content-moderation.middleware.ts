import { NextFunction, Request, Response } from 'express';
import { AppError } from './error.middleware';
import { detectTextIssues } from '../services/moderation/textModeration.service';

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

function normalizeText(value: string): string {
  return value.normalize('NFKC').trim();
}

function detectCategory(text: string): ModerationCategory | null {
  if (!text) return null;
  const matches = detectTextIssues(text);
  if (!matches || matches.length === 0) return null;

  // Map first match category to ModerationCategory
  const first = matches[0];
  const cat = first.categories && first.categories.length ? first.categories[0] : null;
  if (!cat) {
    // if token was a regex pattern, treat as spam_url
    return 'spam_url';
  }

  // ensure returned category is one of the ModerationCategory union
  switch (cat) {
    case 'hate':
      return 'hate';
    case 'sexual':
      return 'sexual';
    case 'violence':
      return 'violence';
    case 'drugs':
      return 'drugs';
    case 'spam_url':
      return 'spam_url';
    case 'insults_it':
      return 'insults_it';
    case 'insults_en':
      return 'insults_en';
    default:
      return 'hate';
  }
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

export function contentModerationMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Skip moderation for AI endpoints that do not accept user-generated titles
  // (the AI service responses are controlled and shouldn't be blocked here)
  const skipPaths = ['/api/ai', '/api/gemini', '/api/ai/', '/api/chat'];
  if (skipPaths.some(p => req.path.startsWith(p))) {
    next();
    return;
  }
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    next();
    return;
  }

  if (!req.body || typeof req.body !== 'object') {
    next();
    return;
  }

  const issues = collectIssues(req.body);

  if (issues.length === 0) {
    next();
    return;
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

  next(new AppError(message, 400, {
    field: firstIssue.path,
    category: firstIssue.category,
    reason: categoryMessages[firstIssue.category],
    issues
  }));
}