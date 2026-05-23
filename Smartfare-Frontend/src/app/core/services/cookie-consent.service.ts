import { Injectable, signal, computed } from '@angular/core';

const KEY_CONSENT = 'sf_cookie_consent';
const KEY_PREFS   = 'sf_cookie_prefs';

export interface CookiePrefs {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  // Reactive state management using Angular Signals
  private prefsSignal = signal<CookiePrefs | null>(this.getPreferences());
  
  /**
   * Signal exposing the current cookie preferences.
   */
  readonly preferences = computed(() => this.prefsSignal());

  /**
   * Signal indicating whether the user has given consent.
   */
  readonly consented = computed(() => this.getCookie(KEY_CONSENT) !== null);

  hasConsented(): boolean {
    return this.getCookie(KEY_CONSENT) !== null;
  }

  getPreferences(): CookiePrefs | null {
    const raw = this.getCookie(KEY_PREFS);
    if (!raw) return null;
    try { 
      return JSON.parse(decodeURIComponent(raw)); 
    } catch { 
      return null; 
    }
  }

  acceptAll(): void {
    const prefs: CookiePrefs = { necessary: true, functional: true, analytics: true, marketing: true };
    this.savePreferences(prefs);
  }

  rejectAll(): void {
    const prefs: CookiePrefs = { necessary: true, functional: false, analytics: false, marketing: false };
    this.savePreferences(prefs);
  }

  savePreferences(prefs: CookiePrefs): void {
    this.setCookie(KEY_PREFS, encodeURIComponent(JSON.stringify(prefs)), 365);
    this.setCookie(KEY_CONSENT, 'done', 365);
    this.prefsSignal.set(prefs);
  }

  clearConsent(): void {
    this.setCookie(KEY_CONSENT, '', -1);
    this.setCookie(KEY_PREFS, '', -1);
    this.prefsSignal.set(null);
  }

  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    let cookieStr = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
    
    // Add Secure flag if served over HTTPS to protect cookie transmission
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:') {
      cookieStr += '; Secure';
    }
    
    document.cookie = cookieStr;
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const prefix = name + '=';
    const match = document.cookie.split('; ').find(c => c.startsWith(prefix));
    // Safe extraction: slice using name length to handle value containing '=' safely
    return match ? decodeURIComponent(match.slice(prefix.length)) : null;
  }
}

