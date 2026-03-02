import { Component, inject, signal, effect } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { SidebarService } from './services/sidebar.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, SidebarComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  private sidebarService = inject(SidebarService);
  isSidebarOpen = this.sidebarService.isSidebarOpen;

  isMobile = signal(false);

  constructor() {
    // Rileva se siamo su mobile
    this.checkIfMobile();
    window.addEventListener('resize', () => this.checkIfMobile());

    // Chiudi la sidebar quando si naviga su mobile
    effect(() => {
      const isOpen = this.isSidebarOpen();
      if (this.isMobile() && isOpen) {
        // La sidebar è già aperta, non fare niente
      }
    });
  }

  private checkIfMobile() {
    this.isMobile.set(window.innerWidth < 769);
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }

  closeSidebarOnMobile() {
    if (this.isMobile()) {
      this.sidebarService.setSidebarState(false);
    }
  }
}
