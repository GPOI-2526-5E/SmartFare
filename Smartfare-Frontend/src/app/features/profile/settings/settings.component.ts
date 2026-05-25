import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { ProfileService } from '../../../core/services/profile.service';
import { ActivityService } from '../../../core/services/activity.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserProfile, UserPreference, UserProfileFull } from '../../../core/models/user-profile.model';
import { ActivityCategory } from '../../../core/models/activity.model';

type SettingsTab = 'profile' | 'preferences' | 'account';

interface LabeledOption {
  value: string;
  label: string;
  icon: string;
}

const TRAVEL_STYLES: LabeledOption[] = [
  { value: 'Culturale', label: 'Culturale', icon: 'bi-bank' },
  { value: 'Avventura', label: 'Avventura', icon: 'bi-compass' },
  { value: 'Relax', label: 'Relax', icon: 'bi-umbrella' },
  { value: 'Gastronomico', label: 'Gastronomico', icon: 'bi-cup-hot' },
  { value: 'Romantico', label: 'Romantico', icon: 'bi-heart' },
  { value: 'Sportivo', label: 'Sportivo', icon: 'bi-bicycle' },
  { value: 'Lusso', label: 'Lusso', icon: 'bi-gem' },
  { value: 'Backpacking', label: 'Backpacking', icon: 'bi-backpack' },
];

const PACE_OPTIONS: LabeledOption[] = [
  { value: 'Lento', label: 'Lento', icon: 'bi-cup-hot' },
  { value: 'Moderato', label: 'Moderato', icon: 'bi-bicycle' },
  { value: 'Intenso', label: 'Intenso', icon: 'bi-lightning-charge-fill' },
];



@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterModule, NavbarComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit, OnDestroy {
  private profileService = inject(ProfileService);
  private activityService = inject(ActivityService);
  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly TRAVEL_STYLES = TRAVEL_STYLES;
  readonly PACE_OPTIONS = PACE_OPTIONS;

  activeTab = signal<SettingsTab>('profile');
  isLoading = signal(true);
  isSavingProfile = signal(false);
  isSavingPreferences = signal(false);
  isUploadingAvatar = signal(false);
  isUploadingBackground = signal(false);

  email = signal('');
  authProvider = signal('');
  hasLocalPassword = signal(false);

  name = signal('');
  surname = signal('');
  city = signal('');
  street = signal('');
  birthDate = signal('');
  avatarUrl = signal('');
  backgroundImageUrl = signal('');
  bio = signal('');
  instagramUrl = signal('');
  twitterUrl = signal('');
  pageBackground = signal('');

  selectedTravelStyles = signal<string[]>([]);
  pace = signal('');
  interestCategoryIds = signal<number[]>([]);
  travelCompanion = signal('');
  notes = signal('');
  activityCategories = signal<ActivityCategory[]>([]);

  passwordCodeSent = signal(false);
  isSendingCode = signal(false);
  isResettingPassword = signal(false);
  verificationCode = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  showNewPassword = signal(false);
  resendSeconds = signal(0);

  private resendTimerId: ReturnType<typeof setInterval> | null = null;

  displayName = computed(() => {
    const n = this.name();
    const s = this.surname();
    if (n || s) return `${n} ${s}`.trim();
    return this.email() || 'Il tuo profilo';
  });

  canChangePassword = computed(() => this.hasLocalPassword());

  authProviderLabel = computed(() => {
    const p = (this.authProvider() || 'local').toLowerCase();
    if (p === 'google') return 'Google + password SmartFare';
    if (p === 'github') return 'GitHub + password SmartFare';
    return 'Email e password';
  });

  age = computed(() => {
    const d = this.birthDate();
    if (!d) return null;
    const birth = new Date(d);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const hasPassed = today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
    if (!hasPassed) age--;
    return age > 0 ? age : null;
  });


  selectedPaceIcon = computed(() =>
    PACE_OPTIONS.find((o) => o.value === this.pace())?.icon ?? 'bi-speedometer2'
  );

  ngOnInit() {
    this.activityService.getCategories().subscribe((result) => {
      const sorted = [...(result?.categories ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'it'));
      this.activityCategories.set(sorted);
    });

    this.profileService.getMyProfile().subscribe(data => {
      if (data) this.hydrateFromData(data);
      this.isLoading.set(false);

      if (!this.backgroundImageUrl()) {
        this.profileService.getRandomLocationImage().subscribe(res => {
          if (res?.imageUrl) this.pageBackground.set(res.imageUrl);
        });
      } else {
        this.pageBackground.set(this.backgroundImageUrl());
      }
    });
  }

  ngOnDestroy() {
    if (this.resendTimerId) clearInterval(this.resendTimerId);
  }


  getTravelStyleIcon(style: string): string {
    return TRAVEL_STYLES.find((entry) => entry.value === style)?.icon ?? 'bi-signpost-2';
  }

  private hydrateFromData(data: UserProfileFull) {
    this.email.set(data.email ?? '');
    this.authProvider.set(data.authProvider ?? 'local');
    this.hasLocalPassword.set(!!data.hasLocalPassword);

    const p = data.profile;
    if (p) {
      this.name.set(p.name ?? '');
      this.surname.set(p.surname ?? '');
      this.city.set(p.city ?? '');
      this.street.set(p.street ?? '');
      this.avatarUrl.set(p.avatarUrl ?? '');
      this.backgroundImageUrl.set(p.backgroundImageUrl ?? '');
      this.bio.set(p.bio ?? '');
      this.instagramUrl.set(p.instagramUrl ?? '');
      this.twitterUrl.set(p.twitterUrl ?? '');
      if (p.birthDate) {
        this.birthDate.set(new Date(p.birthDate).toISOString().split('T')[0]);
      }
    }

    const pref = data.preference;
    if (pref) {
      this.selectedTravelStyles.set(
        pref.travelStyles?.length
          ? [...pref.travelStyles]
          : pref.travelStyle
            ? pref.travelStyle.split(',').map((part) => part.trim()).filter(Boolean)
            : []
      );
      this.pace.set(pref.pace ?? '');
      this.travelCompanion.set(pref.travelCompanion ?? '');
      this.interestCategoryIds.set(
        pref.interestCategoryIds?.length
          ? [...pref.interestCategoryIds]
          : pref.interestCategories?.map((category) => category.id) ?? []
      );
      this.notes.set(pref.notes ?? '');
    }
  }

  setTab(tab: SettingsTab) {
    this.activeTab.set(tab);
  }

  isTravelStyleSelected(style: string): boolean {
    return this.selectedTravelStyles().includes(style);
  }

  toggleTravelStyle(style: string) {
    const current = this.selectedTravelStyles();
    if (current.includes(style)) {
      this.selectedTravelStyles.set(current.filter((entry) => entry !== style));
    } else {
      this.selectedTravelStyles.set([...current, style]);
    }
  }

  isInterestSelected(categoryId: number): boolean {
    return this.interestCategoryIds().includes(categoryId);
  }

  toggleInterestCategory(categoryId: number) {
    const current = this.interestCategoryIds();
    if (current.includes(categoryId)) {
      this.interestCategoryIds.set(current.filter((id) => id !== categoryId));
    } else {
      this.interestCategoryIds.set([...current, categoryId]);
    }
  }

  saveProfile() {
    this.isSavingProfile.set(true);
    const payload: Partial<UserProfile> = {
      name: this.name(),
      surname: this.surname(),
      city: this.city(),
      street: this.street(),
      bio: this.bio(),
      instagramUrl: this.instagramUrl(),
      twitterUrl: this.twitterUrl(),
      birthDate: this.birthDate() ? new Date(this.birthDate()).toISOString() : null,
    };

    this.profileService.updateProfile(payload).subscribe(res => {
      this.isSavingProfile.set(false);
      if (res?.success) {
        this.authService.fetchProfile();
        this.alertService.success('Profilo aggiornato con successo!');
      } else {
        this.alertService.error('Errore durante il salvataggio del profilo.');
      }
    });
  }

  savePreferences() {
    this.isSavingPreferences.set(true);
    const payload: Partial<UserPreference> & {
      travelStyles?: string[];
      interestCategoryIds?: number[];
    } = {
      travelStyles: this.selectedTravelStyles(),
      pace: this.pace() || null,
      travelCompanion: this.travelCompanion() || null,
      notes: this.notes().trim() || null,
      interestCategoryIds: this.interestCategoryIds(),
    };

    this.profileService.updatePreferences(payload).subscribe(res => {
      this.isSavingPreferences.set(false);
      if (res?.success) {
        this.alertService.success('Preferenze salvate!');
        if (res.preference) {
          const pref = res.preference;
          this.selectedTravelStyles.set(pref.travelStyles ?? []);
          this.interestCategoryIds.set(pref.interestCategoryIds ?? []);
        }
      } else {
        this.alertService.error('Errore durante il salvataggio delle preferenze.');
      }
    });
  }

  sendPasswordCode() {
    if (!this.canChangePassword()) {
      this.alertService.error('Su questo account non è stata ancora impostata una password SmartFare.');
      return;
    }
    if (this.resendSeconds() > 0 || this.isSendingCode()) return;

    this.isSendingCode.set(true);
    this.profileService.sendPasswordChangeCode().subscribe((res) => {
      this.isSendingCode.set(false);
      if (res.success) {
        this.passwordCodeSent.set(true);
        this.verificationCode.set('');
        this.alertService.success(res.message || `Codice inviato a ${this.email()}`);
        this.startResendCooldown();
      } else {
        this.alertService.error(res.message || 'Impossibile inviare il codice.');
      }
    });
  }

  onVerificationCodeChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    this.verificationCode.set(digits);
  }

  resetPasswordWithCode() {
    if (!this.passwordCodeSent()) {
      this.alertService.error('Invia prima il codice di verifica alla tua email.');
      return;
    }

    const code = this.verificationCode().trim();
    const pwd = this.newPassword();
    const confirm = this.confirmPassword();

    if (!/^\d{6}$/.test(code)) {
      this.alertService.error('Inserisci il codice a 6 cifre ricevuto via email.');
      return;
    }
    if (pwd.length < 8) {
      this.alertService.error('La password deve avere almeno 8 caratteri.');
      return;
    }
    if (pwd !== confirm) {
      this.alertService.error('Le password non corrispondono.');
      return;
    }

    this.isResettingPassword.set(true);
    this.profileService.resetPasswordWithCode(code, pwd).subscribe((res) => {
      this.isResettingPassword.set(false);
      if (res.success) {
        this.alertService.success(res.message || 'Password aggiornata! Accedi di nuovo con la nuova password.');
        this.cancelPasswordReset();
        this.authService.Logout();
        this.router.navigate(['/login']);
      } else {
        this.alertService.error(res.message || 'Codice non valido o scaduto.');
      }
    });
  }

  cancelPasswordReset() {
    this.passwordCodeSent.set(false);
    this.verificationCode.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.showNewPassword.set(false);
    if (this.resendTimerId) {
      clearInterval(this.resendTimerId);
      this.resendTimerId = null;
    }
    this.resendSeconds.set(0);
  }

  private startResendCooldown() {
    if (this.resendTimerId) clearInterval(this.resendTimerId);
    this.resendSeconds.set(60);
    this.resendTimerId = setInterval(() => {
      const next = this.resendSeconds() - 1;
      if (next <= 0) {
        this.resendSeconds.set(0);
        if (this.resendTimerId) clearInterval(this.resendTimerId);
        this.resendTimerId = null;
      } else {
        this.resendSeconds.set(next);
      }
    }, 1000);
  }

  onAvatarFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.isUploadingAvatar.set(true);
    this.profileService.uploadAvatar(file).subscribe(res => {
      this.isUploadingAvatar.set(false);
      if (res?.url) {
        this.avatarUrl.set(res.url);
        this.authService.updateCachedProfile({ avatarUrl: res.url });
        this.authService.fetchProfile();
        this.alertService.success('Foto profilo aggiornata!');
      } else {
        this.alertService.error('Errore upload avatar.');
      }
    });
  }

  onBackgroundFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.isUploadingBackground.set(true);
    this.profileService.uploadBackground(file).subscribe(res => {
      this.isUploadingBackground.set(false);
      if (res?.url) {
        this.backgroundImageUrl.set(res.url);
        this.pageBackground.set(res.url);
        this.alertService.success('Immagine di sfondo aggiornata!');
      } else {
        this.alertService.error('Errore upload sfondo.');
      }
    });
  }

  logout() {
    this.authService.Logout();
    this.router.navigate(['/login']);
  }

}
