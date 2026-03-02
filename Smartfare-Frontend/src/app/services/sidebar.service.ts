import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  // Inizializza chiusa su mobile, aperta su desktop
  isSidebarOpen = signal(this.isDesktop());

  constructor() {
    // Listener per adattare lo stato quando si ridimensiona la finestra
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        // Se passiamo da mobile a desktop, apri la sidebar
        if (window.innerWidth >= 769 && !this.isSidebarOpen()) {
          this.isSidebarOpen.set(true);
        }
        // Se passiamo da desktop a mobile, chiudi la sidebar
        if (window.innerWidth < 769 && this.isSidebarOpen()) {
          this.isSidebarOpen.set(false);
        }
      });
    }
  }

  private isDesktop(): boolean {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 769;
  }

  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  setSidebarState(isOpen: boolean) {
    this.isSidebarOpen.set(isOpen);
  }
}
