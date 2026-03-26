import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from "@angular/router";

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {

  readonly navItems: NavItem[] = [
    { icon: 'bi bi-house-door', label: 'Home', route: '/home' },
    { icon: 'bi bi-building', label: 'Hotel', route: '/hotel' },
    { icon: 'bi bi-airplane', label: 'Flights', route: '/flights' },
    { icon: 'bi bi-train-front', label: 'Trains', route: '/trains' },
    { icon: 'bi bi-activity', label: 'Activity', route: '/activity' },
  ];

  // Lingue supportate
  languages = [
    { code: 'en', label: 'English' },
    { code: 'it', label: 'Italiano' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'es', label: 'Español' }
  ];

  selectedLanguage: string = 'en'; // default

  isSearchFocused = false;
  mobileMenuOpen = false;

  onSearchFocus(): void { this.isSearchFocused = true; }
  onSearchBlur(): void { this.isSearchFocused = false; }
  toggleMobileMenu(): void { this.mobileMenuOpen = !this.mobileMenuOpen; }
}
