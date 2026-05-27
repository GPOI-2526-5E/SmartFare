import { Injectable, effect, inject } from '@angular/core';
import { CookieConsentService } from './cookie-consent.service';

@Injectable({
  providedIn: 'root'
})
export class ScriptLoaderService {
  private readonly consentService = inject(CookieConsentService);
  private analyticsLoaded = false;
  private marketingLoaded = false;

  constructor() {
    effect(() => {
      const prefs = this.consentService.getPreferences();
      if (prefs) {
        if (prefs.analytics && !this.analyticsLoaded) {
          this.loadAnalytics();
        }
        if (prefs.marketing && !this.marketingLoaded) {
          this.loadMarketing();
        }
      }
    });
  }

  private loadAnalytics() {
    this.analyticsLoaded = true;
    console.log('[ScriptLoader] Analytics scripts would be loaded here (e.g. Google Analytics).');
    // Example:
    // const script = document.createElement('script');
    // script.src = 'https://www.googletagmanager.com/gtag/js?id=YOUR_ID';
    // document.head.appendChild(script);
  }

  private loadMarketing() {
    this.marketingLoaded = true;
    console.log('[ScriptLoader] Marketing scripts would be loaded here (e.g. Meta Pixel).');
  }
}
