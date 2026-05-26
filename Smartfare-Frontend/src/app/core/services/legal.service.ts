import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LegalService {
  // Signals to control the visibility of modals globally
  showPrivacyModal = signal<boolean>(false);
  showCookieModal = signal<boolean>(false);
  showTosModal = signal<boolean>(false);

  openPrivacyModal() {
    this.showPrivacyModal.set(true);
  }

  closePrivacyModal() {
    this.showPrivacyModal.set(false);
  }

  openCookieModal() {
    this.showCookieModal.set(true);
  }

  closeCookieModal() {
    this.showCookieModal.set(false);
  }

  openTosModal() {
    this.showTosModal.set(true);
  }

  closeTosModal() {
    this.showTosModal.set(false);
  }
}
