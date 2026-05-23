import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Itinerary } from '../../../core/models/itinerary.model';
import { UserProfileFull } from '../../../core/models/user-profile.model';
import type { SearchTab } from '../discover-page/discover-page.component';

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';

export type TripSortKey = 'default' | 'likes' | 'duration_asc' | 'duration_desc' | 'recent';
export type UserSortKey = 'default' | 'followers' | 'itineraries';

@Component({
  selector: 'app-discover-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './discover-search-results.component.html',
  styleUrl: './discover-search-results.component.css'
})
export class DiscoverSearchResultsComponent implements OnChanges {
  @Input({ required: true }) searchTitle = '';
  @Input({ required: true }) searchTerm = '';
  @Input() pending = false;
  @Input() activeTab: SearchTab = 'itinerari';
  @Input() trips: Itinerary[] = [];
  @Input() users: UserProfileFull[] = [];

  @Output() back = new EventEmitter<void>();
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<void>();
  @Output() clearSearch = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<SearchTab>();
  @Output() tripSelect = new EventEmitter<Itinerary>();
  @Output() preview = new EventEmitter<{ trip: Itinerary; event: MouseEvent }>();
  @Output() profileOpen = new EventEmitter<UserProfileFull>();
  @Output() followToggle = new EventEmitter<{ user: UserProfileFull; event: MouseEvent }>();
  @Output() authorOpen = new EventEmitter<{ trip: Itinerary; event: MouseEvent }>();

  // ── filter state ────────────────────────────────────────────────────────────
  readonly showFilters = signal(false);

  // trip filters
  readonly tripSort = signal<TripSortKey>('default');
  readonly tripMinDays = signal<number | null>(null);
  readonly tripMaxDays = signal<number | null>(null);

  // user filters
  readonly userSort = signal<UserSortKey>('default');
  readonly userCityFilter = signal('');

  // ── derived lists ────────────────────────────────────────────────────────────
  readonly filteredTrips = computed(() => {
    let list = [...this.trips];

    // filter by duration range
    const minD = this.tripMinDays();
    const maxD = this.tripMaxDays();
    if (minD != null) list = list.filter(t => (t.durationDays ?? 0) >= minD);
    if (maxD != null) list = list.filter(t => (t.durationDays ?? 0) <= maxD);

    // sort
    switch (this.tripSort()) {
      case 'likes':
        list = list.sort((a, b) => (b._count?.favorites ?? 0) - (a._count?.favorites ?? 0));
        break;
      case 'duration_asc':
        list = list.sort((a, b) => (a.durationDays ?? 0) - (b.durationDays ?? 0));
        break;
      case 'duration_desc':
        list = list.sort((a, b) => (b.durationDays ?? 0) - (a.durationDays ?? 0));
        break;
      case 'recent':
        list = list.sort((a, b) => {
          const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return tb - ta;
        });
        break;
    }
    return list;
  });

  readonly filteredUsers = computed(() => {
    let list = [...this.users];

    // filter by city keyword (matches name or city of residence)
    const cityKw = this.userCityFilter().trim().toLowerCase();
    if (cityKw) {
      list = list.filter(u => {
        const name = this.personName(u).toLowerCase();
        const city = (u.profile?.city ?? '').toLowerCase();
        return name.includes(cityKw) || city.includes(cityKw);
      });
    }

    // sort
    switch (this.userSort()) {
      case 'followers':
        list = list.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0));
        break;
      case 'itineraries':
        list = list.sort((a, b) => (b.publicItinerariesCount ?? 0) - (a.publicItinerariesCount ?? 0));
        break;
    }
    return list;
  });

  // how many active filters are there?
  readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.tripSort() !== 'default') n++;
    if (this.tripMinDays() != null) n++;
    if (this.tripMaxDays() != null) n++;
    if (this.userSort() !== 'default') n++;
    if (this.userCityFilter().trim()) n++;
    return n;
  });

  ngOnChanges(changes: SimpleChanges): void {
    // reset filter panel when a new search arrives
    if (changes['searchTerm'] && !changes['searchTerm'].firstChange) {
      this.resetFilters();
    }
  }

  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  resetFilters(): void {
    this.tripSort.set('default');
    this.tripMinDays.set(null);
    this.tripMaxDays.set(null);
    this.userSort.set('default');
    this.userCityFilter.set('');
  }

  setTripSort(v: TripSortKey): void { this.tripSort.set(v); }
  setUserSort(v: UserSortKey): void { this.userSort.set(v); }

  onMinDaysInput(value: string): void {
    const n = parseInt(value, 10);
    this.tripMinDays.set(isNaN(n) ? null : n);
  }

  onMaxDaysInput(value: string): void {
    const n = parseInt(value, 10);
    this.tripMaxDays.set(isNaN(n) ? null : n);
  }

  onUserCityInput(value: string): void {
    this.userCityFilter.set(value);
  }

  // ── helpers ─────────────────────────────────────────────────────────────────
  tripCover(trip: Itinerary): string {
    return trip.imageUrl || trip.location?.image || FALLBACK_COVER;
  }

  likeCount(trip: Itinerary): number {
    return trip._count?.favorites ?? 0;
  }

  stopCount(trip: Itinerary): number {
    return trip._count?.items ?? trip.items?.length ?? 0;
  }

  durationLabel(trip: Itinerary): string {
    const days = trip.durationDays;
    if (days != null && days > 0) return days === 1 ? '1 giorno' : `${days} giorni`;
    return 'Durata variabile';
  }

  placeLabel(trip: Itinerary): string {
    const loc = trip.location;
    if (!loc) return 'Italia';
    return loc.province ? `${loc.name}, ${loc.province}` : loc.name;
  }

  authorName(trip: Itinerary): string {
    const p = trip.user?.profile;
    return `${p?.name ?? ''} ${p?.surname ?? ''}`.trim() || 'Community SmartFare';
  }

  creatorAvatarUrl(trip: Itinerary): string | null {
    return trip.user?.profile?.avatarUrl ?? null;
  }

  creatorInitials(trip: Itinerary): string {
    const parts = this.authorName(trip).split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return this.authorName(trip).slice(0, 2).toUpperCase();
  }

  avatarUrl(user: UserProfileFull): string | null {
    return user.profile?.avatarUrl ?? null;
  }

  personName(user: UserProfileFull): string {
    const name = `${user.profile?.name ?? ''} ${user.profile?.surname ?? ''}`.trim();
    return name || 'Viaggiatore';
  }

  personInitials(user: UserProfileFull): string {
    const parts = this.personName(user).split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return this.personName(user).slice(0, 2).toUpperCase();
  }

  userCityLabel(user: UserProfileFull): string {
    const city = user.profile?.city;
    return city ? city : '';
  }
}
