import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { ItineraryService } from '../../../../core/services/itinerary.service';
import { Router, RouterLink } from '@angular/router';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { AlertService } from '../../../../core/services/alert.service';
import { UIStateService } from '../../../../core/services/ui-state.service';
import { ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { LocationService } from '../../../../core/services/location.service';
import Location from '../../../../core/models/location.model';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { signal } from '@angular/core';

@Component({
  selector: 'app-builder-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './builder-header.component.html',
  styleUrl: './builder-header.component.css'
})
export class BuilderHeaderComponent {
  @Input() workspace: ItineraryWorkspace | null = null;

  @Output() navRequest = new EventEmitter<string>();
  @Output() saveRequest = new EventEmitter<void>();
  @Output() locationSelected = new EventEmitter<number>();

  private locationService = inject(LocationService);

  private authService = inject(AuthService);
  private itineraryService = inject(ItineraryService);
  private router = inject(Router);
  private alertService = inject(AlertService);
  private socialAuthService = inject(SocialAuthService);
  ui = inject(UIStateService);

  showLocationSearch = signal(false);
  locationSearchTerm = signal('');
  locationResults = signal<Location[]>([]);
  isSearchingLocations = signal(false);
  selectedDayForColor = signal<number>(1);

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(
      takeUntilDestroyed(),
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(term => {
        if (term.length < 2) {
          this.locationResults.set([]);
          this.isSearchingLocations.set(false);
          return [];
        }
        this.isSearchingLocations.set(true);
        return this.locationService.getLocations(term);
      })
    ).subscribe({
      next: (results) => {
        this.locationResults.set(results);
        this.isSearchingLocations.set(false);
      },
      error: () => this.isSearchingLocations.set(false)
    });
  }

  isAuthenticated = computed(() => this.authService.IsAuthenticated());

  // Use computed to react to token changes immediately
  user = computed(() => this.authService.getUserData());
  itinerary = this.itineraryService.itinerary;
  autosaveStatus = this.itineraryService.autosaveStatus;

  availableDays = computed(() => {
    const it = this.itinerary();
    if (!it || !it.startDate || !it.endDate) return [1];
    
    const start = new Date(it.startDate);
    const end = new Date(it.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Array.from({ length: Math.max(1, diffDays) }, (_, i) => i + 1);
  });

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

  onCategoryChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const val = select.value === 'all' ? 'all' : parseInt(select.value, 10);
    this.ui.setCategory(val as number | 'all');
    this.ui.setActiveSurface('sidebar');
  }

  onTypeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.ui.setType(select.value as 'all' | 'accommodation' | 'activity');
    this.ui.setActiveSurface('sidebar');
  }

  onTypeChangeDirect(type: 'all' | 'accommodation' | 'activity') {
    this.ui.setType(type);
    this.ui.setActiveSurface('sidebar');
  }

  onDayColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.ui.setDayColor(this.selectedDayForColor(), input.value);
    this.ui.setActiveSurface('map');
  }

  showSelectedMarkers() {
    this.ui.setMapView('selected');
    this.ui.setActiveSurface('map');
    this.alertService.info('Vista mappa: solo marker selezionati');
  }

  showAreaMarkers() {
    this.ui.setMapView('all');
    this.ui.setActiveSurface('map');
    this.alertService.info('Vista mappa: tutti i punti disponibili');
  }

  onLocationSearchChange(term: string) {
    this.locationSearchTerm.set(term);
    this.searchSubject.next(term);
  }

  selectNewLocation(loc: Location) {
    this.locationSelected.emit(loc.id);
    this.showLocationSearch.set(false);
    this.locationSearchTerm.set('');
    this.locationResults.set([]);
    this.alertService.success(`Destinazione cambiata in ${loc.name}`);
  }

  toggleLocationSearch() {
    this.showLocationSearch.set(!this.showLocationSearch());
    if (this.showLocationSearch()) {
      setTimeout(() => {
        const input = document.getElementById('location-search-input');
        input?.focus();
      }, 100);
    }
  }
}