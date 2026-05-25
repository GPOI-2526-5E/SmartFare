import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  LANGUAGE_OPTIONS,
  LanguageOption,
  PHRASE_TRANSLATIONS,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  TRANSLATIONS,
  TranslationKey,
} from './translations';

const STORAGE_KEY = 'smartfare-language';
const DEFAULT_LANGUAGE: SupportedLanguage = 'it';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly currentLanguage = signal<SupportedLanguage>(this.getInitialLanguage());
  private readonly translatedTextNodes = new WeakMap<Text, string>();
  private readonly translatedAttributes = new WeakMap<Element, Map<string, string>>();
  private observer?: MutationObserver;

  readonly language = this.currentLanguage.asReadonly();
  readonly languages: readonly LanguageOption[] = LANGUAGE_OPTIONS;
  readonly selectedLanguage = computed(() => this.getLanguageOption(this.currentLanguage()));

  constructor() {
    effect(() => {
      const language = this.currentLanguage();
      const selected = this.getLanguageOption(language);

      this.document.documentElement.lang = language;
      this.document.documentElement.dir = 'ltr';
      this.document.documentElement.setAttribute('data-locale', selected.locale);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, language);
      }

      this.scheduleDocumentTranslation(language);
    });
  }

  setLanguage(language: string): void {
    if (!this.isSupportedLanguage(language)) return;
    this.currentLanguage.set(language);
  }

  translate(key: TranslationKey): string {
    const language = this.currentLanguage();
    return TRANSLATIONS[language][key] ?? TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;
  }

  getLanguageOption(language: SupportedLanguage): LanguageOption {
    return LANGUAGE_OPTIONS.find((option) => option.code === language) ?? LANGUAGE_OPTIONS[0];
  }

  private getInitialLanguage(): SupportedLanguage {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && this.isSupportedLanguage(saved)) return saved;
    }

    if (typeof navigator !== 'undefined') {
      const browserLanguage = navigator.language.slice(0, 2);
      if (this.isSupportedLanguage(browserLanguage)) return browserLanguage;
    }

    return DEFAULT_LANGUAGE;
  }

  private isSupportedLanguage(language: string): language is SupportedLanguage {
    return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
  }

  private scheduleDocumentTranslation(language: SupportedLanguage): void {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => this.translateDocument(language));
      return;
    }

    setTimeout(() => this.translateDocument(language));
  }

  private translateDocument(language: SupportedLanguage): void {
    const body = this.document.body;
    if (!body) return;

    this.ensureObserver();
    this.translateNode(body, language);
  }

  private ensureObserver(): void {
    if (this.observer || typeof MutationObserver === 'undefined') return;

    const body = this.document.body;
    if (!body) return;

    this.observer = new MutationObserver((records) => {
      const language = this.currentLanguage();

      for (const record of records) {
        if (record.type === 'characterData') {
          this.translateTextNode(record.target as Text, language);
          continue;
        }

        for (const node of Array.from(record.addedNodes)) {
          this.translateNode(node, language);
        }

        if (record.type === 'attributes') {
          this.translateAttributes(record.target as Element, language);
        }
      }
    });

    this.observer.observe(body, {
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'],
      characterData: true,
      childList: true,
      subtree: true,
    });
  }

  private translateNode(node: Node, language: SupportedLanguage): void {
    if (node.nodeType === Node.TEXT_NODE) {
      this.translateTextNode(node as Text, language);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as Element;
    if (this.shouldSkipElement(element)) return;

    this.translateAttributes(element, language);

    for (const child of Array.from(element.childNodes)) {
      this.translateNode(child, language);
    }
  }

  private translateTextNode(node: Text, language: SupportedLanguage): void {
    if (this.shouldSkipNode(node)) return;

    const value = node.nodeValue ?? '';
    if (!value.trim()) return;

    const original = this.translatedTextNodes.get(node) ?? value;
    if (!this.translatedTextNodes.has(node)) {
      this.translatedTextNodes.set(node, original);
    }

    const translated = this.translatePhrase(original, language);
    if (translated !== value) {
      node.nodeValue = translated;
    }
  }

  private translateAttributes(element: Element, language: SupportedLanguage): void {
    if (this.shouldSkipElement(element)) return;

    const attributes = ['placeholder', 'title', 'aria-label', 'alt'];
    let originals = this.translatedAttributes.get(element);

    for (const attribute of attributes) {
      const value = element.getAttribute(attribute);
      if (!value?.trim()) continue;

      if (!originals) {
        originals = new Map<string, string>();
        this.translatedAttributes.set(element, originals);
      }

      const original = originals.get(attribute) ?? value;
      if (!originals.has(attribute)) {
        originals.set(attribute, original);
      }

      const translated = this.translatePhrase(original, language);
      if (translated !== value) {
        element.setAttribute(attribute, translated);
      }
    }
  }

  private translatePhrase(value: string, language: SupportedLanguage): string {
    if (language === DEFAULT_LANGUAGE) return value;

    const targetLanguage = language as Exclude<SupportedLanguage, typeof DEFAULT_LANGUAGE>;
    const leadingWhitespace = value.match(/^\s*/)?.[0] ?? '';
    const trailingWhitespace = value.match(/\s*$/)?.[0] ?? '';
    const normalized = value.trim().replace(/\s+/g, ' ');
    const translated = PHRASE_TRANSLATIONS[normalized]?.[targetLanguage];

    return translated ? `${leadingWhitespace}${translated}${trailingWhitespace}` : value;
  }

  private shouldSkipElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return (
      ['script', 'style', 'noscript', 'code', 'pre'].includes(tagName) ||
      element.hasAttribute('data-no-translate') ||
      element.closest('[data-no-translate]') !== null ||
      element.getAttribute('contenteditable') === 'true'
    );
  }

  private shouldSkipNode(node: Node): boolean {
    const parent = node.parentElement;
    return parent ? this.shouldSkipElement(parent) : false;
  }
}
