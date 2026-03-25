import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly mobileBreakpoint = 992;

  // Inizializza chiusa su mobile, aperta su desktop
  isSidebarOpen = signal(this.isDesktop());

  constructor() {
    // Listener per adattare lo stato quando si ridimensiona la finestra
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        // Se passiamo da mobile a desktop, apri la sidebar
        if (window.innerWidth >= this.mobileBreakpoint && !this.isSidebarOpen()) {
          this.isSidebarOpen.set(true);
        }
        // Se passiamo da desktop a mobile, chiudi la sidebar
        if (window.innerWidth < this.mobileBreakpoint && this.isSidebarOpen()) {
          this.isSidebarOpen.set(false);
        }
      });
    }
  }

  private isDesktop(): boolean {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= this.mobileBreakpoint;
  }

  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  setSidebarState(isOpen: boolean) {
    this.isSidebarOpen.set(isOpen);
  }
}
