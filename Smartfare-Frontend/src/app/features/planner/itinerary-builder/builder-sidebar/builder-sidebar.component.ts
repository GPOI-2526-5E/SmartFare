import {
  Component, OnInit, OnDestroy, signal, computed, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError
} from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LocationService } from '../../../../core/services/location.service';
import { ActivityService } from '../../../../core/services/activity.service';
import { HotelService } from '../../../../core/services/hotel.service';
import Location from '../../../../core/models/location.model';
import { ActivityCategory } from '../../../../core/models/activity.model';
import { Accommodation } from '../../../../core/models/accommodation.model';

// ── Content type definition ─────────────────────────────────────────────────
export type ContentType = 'accommodation' | 'activity' | 'restaurant' | 'shopping' | 'other';

export interface ContentTypeOption {
  id: ContentType;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-builder-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './builder-sidebar.component.html',
  styleUrl: './builder-sidebar.component.css'
})
export class BuilderSidebarComponent implements OnInit, OnDestroy {
  private locationService = inject(LocationService);
  private activityService = inject(ActivityService);
  private hotelService    = inject(HotelService);
  private destroy$        = new Subject<void>();

  // ── Location autocomplete ────────────────────────────────────────────────
  locationQuery    = signal('');
  locationResults  = signal<Location[]>([]);
  selectedLocation = signal<Location | null>(null);
  locationLoading  = signal(false);
  showDropdown     = signal(false);

  private locationSearch$ = new Subject<string>();

  // ── Content type selector ────────────────────────────────────────────────
  contentTypes: ContentTypeOption[] = [
    { id: 'accommodation', label: 'Hotel',        icon: 'bi-building'           },
    { id: 'activity',      label: 'Attività',     icon: 'bi-lightning-charge'   },
    { id: 'restaurant',    label: 'Ristoranti',   icon: 'bi-egg-fried'          },
    { id: 'shopping',      label: 'Shopping',     icon: 'bi-bag'                },
    { id: 'other',         label: 'Altro',        icon: 'bi-grid'               },
  ];

  selectedContentType = signal<ContentType>('accommodation');

  // ── Activity categories filter ───────────────────────────────────────────
  activityCategories   = signal<ActivityCategory[]>([]);
  selectedCategoryId   = signal<number | null>(null);

  // ── Results ──────────────────────────────────────────────────────────────
  accommodations  = signal<Accommodation[]>([]);
  resultsLoading  = signal(false);
  resultsError    = signal<string | null>(null);

  ngOnInit(): void {
    // Load activity categories for the filter
    this.activityService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe(cats => this.activityCategories.set(cats));

    // Debounced location search
    this.locationSearch$.pipe(
      debounceTime(280),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.length < 2) { this.locationResults.set([]); return of([]); }
        this.locationLoading.set(true);
        return this.locationService.getLocations(q).pipe(catchError(() => of([])));
      }),
      takeUntil(this.destroy$)
    ).subscribe(results => {
      this.locationResults.set(results as Location[]);
      this.locationLoading.set(false);
      this.showDropdown.set(true);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Location helpers ─────────────────────────────────────────────────────
  onLocationInput(value: string) {
    this.locationQuery.set(value);
    this.selectedLocation.set(null);
    this.locationSearch$.next(value);
  }

  selectLocation(loc: Location) {
    this.selectedLocation.set(loc);
    this.locationQuery.set(`${loc.name} (${loc.province})`);
    this.showDropdown.set(false);
    this.loadResults();
  }

  clearLocation() {
    this.selectedLocation.set(null);
    this.locationQuery.set('');
    this.locationResults.set([]);
    this.accommodations.set([]);
    this.showDropdown.set(false);
  }

  hideDropdown() {
    // Delay to allow click on item
    setTimeout(() => this.showDropdown.set(false), 180);
  }

  // ── Content type ─────────────────────────────────────────────────────────
  selectContentType(type: ContentType) {
    this.selectedContentType.set(type);
    if (this.selectedLocation()) this.loadResults();
  }

  // ── Load results ─────────────────────────────────────────────────────────
  loadResults() {
    const loc = this.selectedLocation();
    if (!loc) return;

    this.resultsLoading.set(true);
    this.resultsError.set(null);
    this.accommodations.set([]);

    const type = this.selectedContentType();

    if (type === 'accommodation') {
      this.hotelService.getAccommodations(loc.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (items) => { this.accommodations.set(items); this.resultsLoading.set(false); },
          error: ()     => { this.resultsError.set('Errore nel caricamento degli hotel.'); this.resultsLoading.set(false); }
        });
    } else {
      // Placeholder for other types
      setTimeout(() => {
        this.resultsLoading.set(false);
        this.resultsError.set(null);
      }, 400);
    }
  }

  // ── Star helpers ─────────────────────────────────────────────────────────
  starsArray(n: number): number[] {
    return Array.from({ length: Math.max(0, Math.min(5, n)) });
  }

  emptyStarsArray(n: number): number[] {
    return Array.from({ length: Math.max(0, 5 - Math.min(5, n)) });
  }
}
