import { Component, OnInit, HostBinding, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CookieConsentService, CookiePrefs } from '../../../core/services/cookie-consent.service';
import { LegalService } from '../../../core/services/legal.service';
import { Router } from "@angular/router";

@Component({
  selector: 'sf-cookie-consent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cookie-consent.component.html',
  styleUrl: './cookie-consent.component.css'
})
export class CookieConsentComponent implements OnInit {
  @HostBinding('class.sf-theme-dark') darkMode = false;
  visible = false;
  modalOpen = false;
  tab: 'info' | 'prefs' = 'info';

  prefs: CookiePrefs = { necessary: true, functional: false };

  private readonly legalService = inject(LegalService);

  constructor(private consent: CookieConsentService, private router: Router) {
    effect(() => {
      if (this.legalService.showCookieModal()) {
        this.openModal();
        this.tab = 'prefs';
      }
    });
  }

  ngOnInit(): void {
    this.visible = !this.consent.hasConsented();
    const saved = this.consent.getPreferences();
    if (saved) this.prefs = { ...saved };
    // enable dark theme for the component when the site/body indicates dark mode
    try {
      this.darkMode = document.body.classList.contains('theme-dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      this.darkMode = false;
    }
  }

  openModal(): void {
    const saved = this.consent.getPreferences();
    if (saved) this.prefs = { ...saved };
    this.modalOpen = true;
    this.tab = 'info';
  }
  closeModal(): void {
    this.modalOpen = false;
    this.legalService.closeCookieModal();
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('sf-overlay')) this.closeModal();
  }

  acceptAll(): void {
    this.consent.acceptAll();
    this.prefs = { necessary: true, functional: true };
    this.visible = false;
    this.closeModal();
    this.reloadComponent();

  }

  rejectAll(): void {
    this.consent.rejectAll();
    this.prefs = { necessary: true, functional: false };
    this.visible = false;
    this.closeModal();
    this.reloadComponent();
  }
  
  reloadComponent() {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([this.router.url]);
    });
  }

  saveAndClose(): void {
    this.prefs.necessary = true;
    this.consent.savePreferences(this.prefs);
    this.visible = false;
    this.closeModal();
  }
}
