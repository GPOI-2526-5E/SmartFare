import { AfterViewInit, Component, ElementRef, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from "@angular/router";
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { TopNavbarComponent } from "../top-navbar/top-navbar.component";
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { ItineraryService } from '../../../core/services/itinerary.service';
import { animate, query, state, style, transition, trigger } from '@angular/animations';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationKey } from '../../../core/i18n/translations';
import { I18nService } from '../../../core/i18n/i18n.service';

interface NavItem {
  icon: string;
  labelKey: TranslationKey;
  route: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [FormsModule, RouterLink, TopNavbarComponent, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  animations: [
    trigger('navReveal', [
      state('hidden', style({ opacity: 0, transform: 'translateY(-18px)' })),
      state('visible', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('hidden => visible', [
        query('.nav-animate', [style({ opacity: 0, transform: 'translateY(-18px)' }), animate('650ms cubic-bezier(0.2, 0, 0, 1)')], { optional: true })
      ])
    ])
  ]
})
export class NavbarComponent implements AfterViewInit {
  @ViewChild('navbarRoot', { static: true })
  private readonly navbarRoot?: ElementRef<HTMLElement>;

  protected readonly isVisible = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertService: AlertService,
    private socialAuthService: SocialAuthService,
    private itineraryService: ItineraryService,
    private i18nService: I18nService
  ) { };

  ngAfterViewInit(): void {
    queueMicrotask(() => this.isVisible.set(true));
  }

  readonly navItems: NavItem[] = [
    { icon: 'bi bi-house-door', labelKey: 'nav.home', route: '/' },
    { icon: 'bi bi-compass', labelKey: 'nav.discover', route: '/discover' },
    { icon: 'bi bi-journal-bookmark', labelKey: 'nav.create', route: '/itineraries/new' },
    { icon: 'bi bi-magic', labelKey: 'nav.aiPlanner', route: '/voyager' },
    { icon: 'bi bi-map', labelKey: 'nav.interactiveMap', route: '/interactive-map' }
  ];

  mobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.syncBodyScroll();
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    this.syncBodyScroll();
  }

  get isAuthenticated() {
    return this.authService.IsAuthenticated();
  }

  get userAvatar() {
    const profile = this.authService.userProfile();
    if (profile?.avatarUrl) return profile.avatarUrl;
    return this.authService.getUserData()?.avatarUrl;
  }

  get userName() {
    const profile = this.authService.userProfile();
    if (profile?.name || profile?.surname) {
      return `${profile.name || ''} ${profile.surname || ''}`.trim();
    }

    const data = this.authService.getUserData();
    if (!data) return '';
    if (data.name || data.given_name) {
      const first = data.name || data.given_name;
      const last = data.surname || data.family_name || '';
      return `${first} ${last}`.trim();
    }
    return this.i18nService.translate('user.traveler');
  }

  get userEmail() {
    return this.authService.getUserData()?.email;
  }

  async login() {
    this.closeMobileMenu();
    try {
      await this.socialAuthService.signOut(true);
    } catch {
    }
    this.router.navigate(['/login']);
  }

  async logout() {
    this.closeMobileMenu();

    try {
      await this.socialAuthService.signOut(true);
    } catch {
    }

    this.authService.Logout();
    this.itineraryService.clearDraft();
    this.alertService.show('Logout effettuato con successo!');
    this.router.navigate(['/']);
  }

  openAiPlanner(event?: Event) {
    event?.preventDefault();
    this.closeMobileMenu();
    this.router.navigate(['/voyager'], {
      queryParams: {
        sessionId: null,
        prompt: null
      }
    });
  }

  private syncBodyScroll(): void {
    document.body.style.overflow = this.mobileMenuOpen ? 'hidden' : '';
  }
}
