import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { LocationService } from '../../../core/services/location.service';
import { ItineraryService } from '../../../core/services/itinerary.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import Location from '../../../core/models/location.model';

@Component({
  selector: 'app-manual-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './manual-planner.component.html',
  styleUrl: './manual-planner.component.css'
})
export class ManualPlannerComponent implements OnInit, OnDestroy {
  // State using Signals
  destination = signal('');
  checkinDate = signal('');
  checkoutDate = signal('');

  filteredLocations = signal<Location[]>([]);
  showSuggestions = signal(false);

  // Persistence State
  showResumeChoice = signal(false);
  private pendingDraft = signal<any>(null);

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private locationService: LocationService,
    private itineraryService: ItineraryService,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.setDefaultDates();
  }

  private setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    this.checkinDate.set(today.toISOString().split('T')[0]);
    this.checkoutDate.set(tomorrow.toISOString().split('T')[0]);
  }

  ngOnInit(): void {
    // 1. Setup debounced location search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) return [[]];
        return this.locationService.getLocations(query);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (locations) => {
        this.filteredLocations.set(locations);
        this.showSuggestions.set(locations.length > 0);
      },
      error: (err) => {
        console.error('Error fetching locations:', err);
      }
    });

    // 2. Check for existing draft to offer resume
    if (!this.authService.IsAuthenticated()) return;

    const savedId = sessionStorage.getItem('last_saved_itinerary_id');
    const savedAt = sessionStorage.getItem('last_saved_itinerary_updated_at');

    if (this.itineraryService.hasDraft()) {
      this.showResumeChoice.set(true);
    } else {
      this.itineraryService.getLatestFromBackend().pipe(takeUntil(this.destroy$)).subscribe(draft => {
        if (draft) {
          if (savedId && draft.id?.toString() === savedId && draft.updatedAt === savedAt) {
            return;
          }
          this.pendingDraft.set(draft);
          this.showResumeChoice.set(true);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDestinationInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.destination.set(val);
    this.searchSubject.next(val);
  }

  resumeItinerary() {
    const draft = this.itineraryService.itinerary() || this.pendingDraft();
    if (draft) {
      this.itineraryService.setCurrentItinerary(draft, { autosave: false });
      this.router.navigate(['/itineraries', 'builder']);
    }
    this.showResumeChoice.set(false);
  }

  createNewItinerary() {
    this.itineraryService.clearDraft();
    this.showResumeChoice.set(false);
    this.destination.set('');
    this.setDefaultDates();
  }

  selectLocation(location: Location) {
    this.destination.set(`${location.name} (${location.province})`);
    this.showSuggestions.set(false);
    this.filteredLocations.set([]);
  }

  startPlanning() {
    const dest = this.destination();
    const cin = this.checkinDate();
    const cout = this.checkoutDate();

    if (!dest || !cin || !cout) {
      this.alertService.warning('Per favore, compila tutti i campi richiesti.');
      return;
    }

    // Date validation
    if (new Date(cin) >= new Date(cout)) {
      this.alertService.warning('La data di ritorno deve essere successiva alla data di arrivo.');
      return;
    }

    // Set persistence state before navigating
    this.itineraryService.setCurrentItinerary({
      name: `Viaggio a ${dest}`,
      startDate: cin,
      endDate: cout,
      items: []
    });

    const queryParams = {
      dest: dest,
      in: cin,
      out: cout
    };

    this.router.navigate(['/itineraries', 'builder'], { queryParams });
  }
}
