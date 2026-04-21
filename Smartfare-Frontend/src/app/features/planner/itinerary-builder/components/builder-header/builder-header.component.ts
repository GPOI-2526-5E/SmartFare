import { Component, EventEmitter, Output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../../core/auth/auth.service';
import { ItineraryService } from '../../../../../core/services/itinerary.service';
import { Router, RouterLink } from '@angular/router';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { AlertService } from '../../../../../core/services/alert.service';

@Component({
  selector: 'app-builder-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './builder-header.component.html',
  styleUrl: './builder-header.component.css'
})
export class BuilderHeaderComponent {
  @Output() navRequest = new EventEmitter<string>();
  @Output() saveRequest = new EventEmitter<void>();

  private authService = inject(AuthService);
  private itineraryService = inject(ItineraryService);
  private router = inject(Router);
  private alertService = inject(AlertService);
  private socialAuthService = inject(SocialAuthService);

  isAuthenticated = computed(() => this.authService.IsAuthenticated());

  // Use computed to react to token changes immediately
  user = computed(() => this.authService.getUserData());
  itinerary = this.itineraryService.itinerary;
  autosaveStatus = this.itineraryService.autosaveStatus;

  get saveStatusIcon(): string {
    const status = this.autosaveStatus();

    if (status === 'saving') return 'bi bi-cloud-upload';
    if (status === 'error') return 'bi bi-cloud-slash';
    return 'bi bi-cloud-check';
  }

  onNavRequest(url: string, event: Event) {
    event.preventDefault();
    this.navRequest.emit(url);
  }

  updateName(newName: string) {
    const current = this.itinerary();
    if (current) {
      this.itineraryService.setCurrentItinerary({
        ...current,
        name: newName?.trim() || 'Senza titolo'
      });
    }
  }
  saveItinerary() {
    if (!this.isAuthenticated()) {
      this.saveRequest.emit();
      return;
    }

    const current = this.itinerary();
    if (current) {
      this.itineraryService.saveToBackend(current).subscribe({
        next: (saved) => {
          this.alertService.success('Itinerario salvato con successo!');
          
          if (saved && saved.id) {
            // Track exactly what we saved to avoid resume prompts for it
            sessionStorage.setItem('last_saved_itinerary_id', saved.id.toString());
            sessionStorage.setItem('last_saved_itinerary_updated_at', saved.updatedAt || '');
          }
          
          this.itineraryService.clearDraft();
          this.router.navigate(['/home']);
        },
        error: () => this.alertService.error('Errore durante il salvataggio.')
      });
    }
  }

  async logout() {
    try {
      await this.socialAuthService.signOut(true);
    } catch {
      // Ignore
    }
    this.authService.Logout();
    this.itineraryService.clearDraft();
    this.alertService.success('Logout effettuato con successo!');
    this.router.navigate(['/']);
  }
}
