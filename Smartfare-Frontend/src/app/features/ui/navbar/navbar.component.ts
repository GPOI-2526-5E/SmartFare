import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from "@angular/router";
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { TopNavbarComponent } from "../top-navbar/top-navbar.component";
import { SocialAuthService } from '@abacritt/angularx-social-login';


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

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertService: AlertService,
    private socialAuthService: SocialAuthService
  ) { };

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

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.syncBodyScroll();
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    this.syncBodyScroll();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isPinned = window.scrollY > this.pinOffset;
  }

  get isAuthenticated() {
    return this.authService.IsAuthenticated();
  }

  async logout() {
    this.closeMobileMenu();

    try {
      await this.socialAuthService.signOut(true);
    } catch {
      // Ignore: user might not be logged in with a social provider.
    }

    this.authService.Logout();
    this.alertService.show('Logout effettuato con successo!');
    this.router.navigate(['/']);
  }

  private syncBodyScroll(): void {
    document.body.style.overflow = this.mobileMenuOpen ? 'hidden' : '';
  }
}
