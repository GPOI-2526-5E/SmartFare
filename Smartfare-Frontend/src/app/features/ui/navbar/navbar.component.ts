import { Component } from '@angular/core';

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
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  readonly contactInfo: ContactInfo = {
    phone: '(000) 999 - 898 - 999',
    email: 'info@mytravel.com',
    currency: 'EUR',
    signInLabel: 'Sign in or Register'
  };

  readonly navItems: NavItem[] = [
    { label: 'Home', hasDropdown: true, route: '/home' },
    { label: 'Hotel', hasDropdown: true, route: '/hotel' },
    { label: 'Tour', hasDropdown: true, route: '/tour' },
    { label: 'Activity', hasDropdown: true, route: '/activity' },
    { label: 'Rental', hasDropdown: true, route: '/rental' },
    { label: 'Car', hasDropdown: true, route: '/car' },
    { label: 'Yacht', hasDropdown: true, route: '/yacht' },
    { label: 'Flights', hasDropdown: true, route: '/flights' },
    { label: 'Pages', hasDropdown: true, route: '/pages' }
  ];

  isSearchFocused = false;

  onSearchFocus(): void {
    this.isSearchFocused = true;
  }

  onSearchBlur(): void {
    this.isSearchFocused = false;
  }
}
