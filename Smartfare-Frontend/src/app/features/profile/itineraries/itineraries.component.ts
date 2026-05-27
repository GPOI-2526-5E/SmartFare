import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ItineraryService } from '../../../core/services/itinerary.service';
import { Itinerary } from '../../../core/models/itinerary.model';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { AuthService } from '../../../core/auth/auth.service';

interface ItineraryGroup {
  locationName: string;
  items: Itinerary[];
}

type TabType = 'itineraries' | 'favorites';

@Component({
  selector: 'app-itineraries',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FormsModule],
  templateUrl: './itineraries.component.html',
  styleUrl: './itineraries.component.css',
})
export class ItinerariesComponent implements OnInit {
  private allItineraries = signal<Itinerary[]>([]);
  private allFavorites = signal<Itinerary[]>([]);

  isLoading = signal(false);
  isDeletingItinerary = signal(false);
  activeTab = signal<TabType>('itineraries');
  itineraryPendingDelete = signal<Itinerary | null>(null);
  deleteError = signal<string | null>(null);

  // Pagination limits per group
  limitByGroup = signal<Record<string, number>>({});

  userAvatar = computed(() => {
    const profile = this.authService.userProfile();
    if (profile?.avatarUrl) return profile.avatarUrl;
    return this.authService.getUserData()?.avatarUrl || null;
  });

  userInitial = computed(() => {
    const profile = this.authService.userProfile();
    if (profile?.name || profile?.surname) {
      return (profile.name || profile.surname || 'U').charAt(0).toUpperCase();
    }
    const userData = this.authService.getUserData();
    if (userData) {
      return (userData.name || userData.email || 'U').charAt(0).toUpperCase();
    }
    return 'U';
  });

  searchQuery = signal('');

  // ─── Computed grouped list ───────────────────────────────────────────────
  groupedItineraries = computed<ItineraryGroup[]>(() => {
    const source =
      this.activeTab() === 'favorites'
        ? this.allFavorites()
        : this.allItineraries();

    const search = this.searchQuery().toLowerCase().trim();

    const filtered = search
      ? source.filter(
          it =>
            it.name.toLowerCase().includes(search) ||
            it.location?.name?.toLowerCase().includes(search)
        )
      : [...source];

    // Group by location name
    const groupsMap = new Map<string, Itinerary[]>();
    for (const it of filtered) {
      const locName = it.location?.name || 'Altre Destinazioni';
      if (!groupsMap.has(locName)) {
        groupsMap.set(locName, []);
      }
      groupsMap.get(locName)!.push(it);
    }

    // Convert map to array of objects
    const groups: ItineraryGroup[] = [];
    for (const [locationName, items] of groupsMap.entries()) {
      groups.push({ locationName, items });
    }

    // Sort groups alphabetically (putting 'Altre Destinazioni' at the end)
    groups.sort((a, b) => {
      if (a.locationName === 'Altre Destinazioni') return 1;
      if (b.locationName === 'Altre Destinazioni') return -1;
      return a.locationName.localeCompare(b.locationName);
    });

    return groups;
  });

  get totalCount() {
    return this.allItineraries().length;
  }
  get favoritesCount() {
    return this.allFavorites().length;
  }
  get hasActiveFilters(): boolean {
    return false; // Deprecated
  }

  constructor(
    private itineraryService: ItineraryService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Initial values are now handled by computed signals

    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'favorites') {
        this.activeTab.set('favorites');
        this.loadFavorites();
      } else {
        this.activeTab.set('itineraries');
        this.loadItineraries();
      }
    });
  }

  loadItineraries(): void {
    this.isLoading.set(true);
    this.itineraryService.getMyItineraries().subscribe(data => {
      this.allItineraries.set(data);
      this.isLoading.set(false);
    });
  }

  loadFavorites(): void {
    this.isLoading.set(true);
    this.itineraryService.getMyFavorites().subscribe(data => {
      this.allFavorites.set(data);
      this.isLoading.set(false);
    });
  }

  setTab(tab: TabType): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      queryParams: { tab: tab === 'favorites' ? 'favorites' : null },
      queryParamsHandling: 'merge',
    });
    if (tab === 'favorites' && this.allFavorites().length === 0) {
      this.loadFavorites();
    } else if (tab === 'itineraries' && this.allItineraries().length === 0) {
      this.loadItineraries();
    }
  }

  getLimit(groupName: string): number {
    return this.limitByGroup()[groupName] || 4;
  }

  showMore(groupName: string): void {
    this.limitByGroup.update(limits => ({
      ...limits,
      [groupName]: (limits[groupName] || 4) + 4
    }));
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  createNewTrip(): void {
    this.router.navigate(['/itineraries/new']);
  }

  createNewTripInLocation(locationName: string): void {
    if (locationName === 'Altre Destinazioni') {
      this.router.navigate(['/itineraries/new']);
    } else {
      this.router.navigate(['/itineraries/new'], { queryParams: { location: locationName } });
    }
  }

  editItinerary(itinerary: Itinerary, event: Event): void {
    event.stopPropagation();
    this.itineraryService.setCurrentItinerary(itinerary, { autosave: false });
    this.router.navigate(['/itineraries/builder'], {
      queryParams: { itineraryId: itinerary.id },
    });
  }

  promptDeleteItinerary(itinerary: Itinerary, event: Event): void {
    event.stopPropagation();
    this.deleteError.set(null);
    this.itineraryPendingDelete.set(itinerary);
  }

  closeDeleteModal(): void {
    if (this.isDeletingItinerary()) return;
    this.itineraryPendingDelete.set(null);
    this.deleteError.set(null);
  }

  confirmDeleteItinerary(): void {
    const itinerary = this.itineraryPendingDelete();
    if (!itinerary || this.isDeletingItinerary()) return;
    if (typeof itinerary.id !== 'number') {
      this.deleteError.set("L'itinerario selezionato non ha un ID valido.");
      return;
    }

    const itineraryId = itinerary.id;

    this.isDeletingItinerary.set(true);
    this.deleteError.set(null);

    this.itineraryService.deleteItinerary(itineraryId).subscribe({
      next: () => {
        this.allItineraries.update(items => items.filter(item => item.id !== itineraryId));
        this.allFavorites.update(items => items.filter(item => item.id !== itineraryId));
        this.itineraryPendingDelete.set(null);
        this.isDeletingItinerary.set(false);
      },
      error: () => {
        this.deleteError.set('Non sono riuscito a eliminare l’itinerario. Riprova tra poco.');
        this.isDeletingItinerary.set(false);
      }
    });
  }

  previewItinerary(itinerary: Itinerary, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/itineraries/preview'], {
      queryParams: { itineraryId: itinerary.id },
    });
  }

  getActivityCount(itinerary: Itinerary): number {
    return itinerary._count?.items ?? itinerary.items?.length ?? 0;
  }

  getTripDuration(itinerary: Itinerary): string {
    if (!itinerary.startDate || !itinerary.endDate) {
      return 'Durata da confermare';
    }

    const start = new Date(itinerary.startDate);
    const end = new Date(itinerary.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 'Durata da confermare';
    }

    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const diffDays = Math.max(1, Math.round((endUtc - startUtc) / 86400000) + 1);

    return diffDays === 1 ? '1 giorno' : `${diffDays} giorni`;
  }

  formatDateRange(itinerary: Itinerary): string {
    if (!itinerary.startDate) return 'Date da confermare';
    const start = new Date(itinerary.startDate);
    const end = itinerary.endDate ? new Date(itinerary.endDate) : null;
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    const startStr = start.toLocaleDateString('it-IT', opts);
    if (!end) return startStr;
    return `${startStr} – ${end.toLocaleDateString('it-IT', opts)}`;
  }

  // Return the owner's initial (first letter of name or surname) for avatar fallback
  getOwnerInitial(itinerary: Itinerary): string {
    const name = itinerary.user?.profile?.name || itinerary.user?.profile?.surname || '';
    return (name.charAt(0) || 'U').toUpperCase();
  }



}
