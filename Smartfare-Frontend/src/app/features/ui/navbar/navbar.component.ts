import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ContactInfo {
  phone: string;
  email: string;
  currency: string;
  signInLabel: string;
}

interface NavItem {
  label: string;
  hasDropdown: boolean;
  route: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  readonly contactInfo: ContactInfo = {
    phone: '(000) 999-898-999',
    email: 'info@mytravel.com',
    currency: 'EUR', // possiamo mantenerla per eventuale uso interno
    signInLabel: 'Sign in or Register'
  };

  readonly navItems: NavItem[] = [
    { label: 'Home', hasDropdown: false, route: '/home' },
    { label: 'Hotel', hasDropdown: false, route: '/hotel' },
    { label: 'Tour', hasDropdown: false, route: '/tour' },
    { label: 'Activity', hasDropdown: false, route: '/activity' },
    { label: 'Rental', hasDropdown: false, route: '/rental' },
    { label: 'Car', hasDropdown: false, route: '/car' },
    { label: 'Yacht', hasDropdown: false, route: '/yacht' },
    { label: 'Flights', hasDropdown: false, route: '/flights' },
    { label: 'Pages', hasDropdown: false, route: '/pages' }
  ];

  // Lingue supportate
  languages = [
    { code: 'en', label: 'English' },
    { code: 'it', label: 'Italiano' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'es', label: 'Español' }
  ];

  selectedLanguage = 'en';

  isScrolled = false;
  isSearchFocused = false;
  mobileMenuOpen = false;

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 0;
  }

  onSearchFocus(): void {
    this.isSearchFocused = true;
  }

  onSearchBlur(): void {
    this.isSearchFocused = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
}
