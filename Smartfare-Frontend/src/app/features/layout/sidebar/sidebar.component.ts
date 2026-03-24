import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { SidebarService } from '../../../core/services/sidebar.service';
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
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile()) {
        this.sidebarService.setSidebarState(false);
      }
    });

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
    { label: 'Pianifica', path: '/home', icon: 'bi-map-fill' }
  ];

  secondary = [
    { label: 'Accedi', path: '/login', icon: 'bi-box-arrow-in-right' },
    { label: 'Registrati', path: '/register', icon: 'bi-person-plus-fill' },
    { label: 'Supporto', path: '/support', icon: 'bi-life-preserver' }
  ];
}
