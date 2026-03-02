import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  private sidebarService = inject(SidebarService);
  private router = inject(Router);
  isSidebarOpen = this.sidebarService.isSidebarOpen;

  isMobile = signal(false);

  constructor() {
    // Chiudi la sidebar su navigazione quando su mobile
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile()) {
        this.sidebarService.setSidebarState(false);
      }
    });

    // Rileva se siamo su mobile
    this.checkIfMobile();
    window.addEventListener('resize', () => this.checkIfMobile());
  }

  private checkIfMobile() {
    this.isMobile.set(window.innerWidth < 769);
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }

  navigation = [
    { label: 'Home', path: '/', icon: 'bi-house-fill' },
    { label: 'Esplora', path: '/explore', icon: 'bi-compass-fill' }
  ];

  secondary = [
    { label: 'settings', path: '/settings', icon: 'bi-gear-fill' },
    { label: 'Aiuto & Support', path: '/support', icon: 'bi-question-circle-fill' },
    { label: 'Cronologia', path: '/history', icon: 'bi-clock-history' }
  ];
}
