import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from "@angular/router";
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { TopNavbarComponent } from "../top-navbar/top-navbar.component";

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [FormsModule, RouterLink, TopNavbarComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {

  constructor(private authService: AuthService, private router: Router, private alertService: AlertService) { };

  readonly navItems: NavItem[] = [
    { icon: 'bi bi-house-door', label: 'Home', route: '/home' },
    { icon: 'bi bi-building', label: 'Hotel', route: '/hotel' },
    { icon: 'bi bi-airplane', label: 'Flights', route: '/flights' },
    { icon: 'bi bi-train-front', label: 'Trains', route: '/trains' },
    { icon: 'bi bi-activity', label: 'Activity', route: '/activity' },
  ];

  mobileMenuOpen = false;
  isPinned = false;
  readonly pinOffset = 44;

  toggleMobileMenu(): void { this.mobileMenuOpen = !this.mobileMenuOpen; }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isPinned = window.scrollY > this.pinOffset;
  }

  get isAuthenticated() {
    return this.authService.IsAuthenticated();
  }

  logout() {
    this.authService.Logout();
    this.alertService.show('Logout effettuato con successo!');
    this.router.navigate(['/']);
  }
}
