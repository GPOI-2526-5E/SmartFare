import { Component, OnInit, OnDestroy, DestroyRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { FooterComponent } from '../../ui/footer/footer.component';
import { AppLoaderComponent } from '../../ui/loader/loader.component';
import { DiscoverMapComponent, DiscoverRoutePoint } from '../discover-map/discover-map.component';
import { DiscoverSearchResultsComponent } from '../discover-search-results/discover-search-results.component';
import { ItineraryService } from '../../../core/services/itinerary.service';
import { BuilderPoi } from '../../../core/models/builder.types';
import { ItineraryWorkspace } from '../../../core/models/itinerary.model';
import { ProfileService } from '../../../core/services/profile.service';
import { LocationService } from '../../../core/services/location.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Itinerary } from '../../../core/models/itinerary.model';
import { UserProfileFull } from '../../../core/models/user-profile.model';
import Location from '../../../core/models/location.model';

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';
const CAROUSEL_SLIDES = 6;
const TOP_CREATORS_LIMIT = 4;
const TOP_TRIPS_LIMIT = 5;
const LATEST_LIMIT = 8;
const NEARBY_LIMIT = 6;
const MIN_SEARCH_LENGTH = 2;
const CAROUSEL_INTERVAL_MS = 5200;

export type SearchTab = 'itinerari' | 'utenti' | 'luoghi';
export type MapViewMode = 'route' | 'zone';

export type ZoneCategoryPill = {
  key: string;
  label: string;
  icon: string;
  type: 'all' | 'accommodation' | 'activity';
  categoryId: number | 'all';
};

@Component({
  selector: 'app-discover-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NavbarComponent,
    FooterComponent,
    AppLoaderComponent,
    DiscoverMapComponent,
    DiscoverSearchResultsComponent
  ],
  templateUrl: './discover-page.component.html',
  styleUrl: './discover-page.component.css'
})
export class DiscoverPageComponent implements OnInit, OnDestroy {
  private readonly itineraryService = inject(ItineraryService);
  private readonly profileService = inject(ProfileService);
  private readonly locationService = inject(LocationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly pageLoading = signal(true);
  readonly searchPending = signal(false);
  readonly routeLoading = signal(false);

  readonly carouselPlaces = signal<Location[]>([]);
  readonly activeSlide = signal(0);

  readonly topLikedTrips = signal<Itinerary[]>([]);
  readonly latestTrips = signal<Itinerary[]>([]);
  readonly topCreators = signal<UserProfileFull[]>([]);
  readonly nearbyTrips = signal<Itinerary[]>([]);
  readonly nearbyAnchor = signal<Location | null>(null);

  readonly searchResultTrips = signal<Itinerary[]>([]);
  readonly searchUsers = signal<UserProfileFull[]>([]);
  readonly searchPlaces = signal<Location[]>([]);
  readonly searchSubmitted = signal(false);
  readonly activeSearchTab = signal<SearchTab>('itinerari');

  readonly selectedTripId = signal<number | null>(null);
  readonly routePoints = signal<DiscoverRoutePoint[]>([]);

  readonly mapViewMode = signal<MapViewMode>('route');
  readonly zoneWorkspace = signal<ItineraryWorkspace | null>(null);
  readonly zoneLoading = signal(false);
  readonly zoneFilterType = signal<'all' | 'accommodation' | 'activity'>('all');
  readonly zoneFilterCategory = signal<number | 'all'>('all');

  readonly searchTerm = computed(() => this.searchControl.value);
  readonly isLoggedIn = computed(() => this.authService.IsAuthenticated());

  readonly selectedTrip = computed(() => {
    const id = this.selectedTripId();
    if (id == null) return null;
    const pools = [
      this.topLikedTrips(),
      this.latestTrips(),
      this.nearbyTrips(),
      this.searchResultTrips()
    ];
    for (const pool of pools) {
      const found = pool.find((t) => t.id === id);
      if (found) return found;
    }
    return null;
  });

  readonly mapLocation = computed(() => {
    if (this.mapViewMode() === 'zone') {
      return this.zoneWorkspace()?.location ?? null;
    }
    const trip = this.selectedTrip();
    if (trip?.location?.latitude != null) return trip.location;
    return null;
  });

  readonly allZonePois = computed(() => {
    const ws = this.zoneWorkspace();
    if (!ws) return [] as BuilderPoi[];

    const accommodationPois: BuilderPoi[] = ws.accommodations.map((acc) => ({
      key: `accommodation-${acc.id}`,
      type: 'accommodation' as const,
      entityId: acc.id,
      title: acc.name,
      subtitle: acc.street || 'Hotel',
      latitude: acc.latitude,
      longitude: acc.longitude,
      itemTypeCode: 'ACCOMMODATION' as const,
      imageUrl: acc.imageUrl,
      price: acc.pricePerNight,
      rating: acc.stars
    }));

    const activityPois: BuilderPoi[] = ws.activities.map((activity) => ({
      key: `activity-${activity.id}`,
      type: 'activity' as const,
      entityId: activity.id,
      title: activity.name,
      subtitle: activity.category?.name || activity.street || 'Attivita',
      latitude: activity.latitude,
      longitude: activity.longitude,
      categoryId: activity.categoryId,
      categoryName: activity.category?.name,
      itemTypeCode: 'ACTIVITY' as const,
      imageUrl: activity.imageUrl,
      price: activity.price,
      rating: activity.rating
    }));

    return [...accommodationPois, ...activityPois];
  });

  readonly zoneCategoryPills = computed((): ZoneCategoryPill[] => {
    const ws = this.zoneWorkspace();
    const pills: ZoneCategoryPill[] = [
      { key: 'all', label: 'Tutto', icon: 'bi-grid-3x3-gap-fill', type: 'all', categoryId: 'all' },
      { key: 'hotel', label: 'Hotel', icon: 'bi-building', type: 'accommodation', categoryId: 'all' }
    ];
    if (!ws) return pills;

    const usedCatIds = new Set(ws.activities.map((a) => a.categoryId));
    for (const cat of ws.categories || []) {
      if (usedCatIds.has(cat.id)) {
        pills.push({
          key: `cat-${cat.id}`,
          label: cat.name,
          icon: this.categoryIcon(cat.name),
          type: 'activity',
          categoryId: cat.id
        });
      }
    }
    return pills;
  });

  readonly zoneActivePillKey = computed(() => {
    const t = this.zoneFilterType();
    const c = this.zoneFilterCategory();
    if (t === 'all') return 'all';
    if (t === 'accommodation') return 'hotel';
    if (t === 'activity' && c !== 'all') return `cat-${c}`;
    return 'all';
  });

  readonly filteredZonePois = computed(() => {
    const selectedType = this.zoneFilterType();
    const selectedCategory = this.zoneFilterCategory();

    return this.allZonePois().filter((poi) => {
      if (selectedType !== 'all' && poi.type !== selectedType) return false;
      if (selectedCategory !== 'all' && poi.type === 'activity' && poi.categoryId !== selectedCategory) {
        return false;
      }
      return true;
    });
  });

  readonly activeCarouselPlace = computed(() => {
    const places = this.carouselPlaces();
    return places[this.activeSlide()] ?? null;
  });

  readonly searchTitle = computed(() => {
    const term = this.searchTerm();
    return term ? `Risultati per "${term}"` : 'Risultati ricerca';
  });

  readonly topCreatorPreview = computed(() => this.topCreators().slice(0, TOP_CREATORS_LIMIT));

  private carouselTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.loadVetrina();
    this.startCarousel();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
  }

  private loadVetrina(): void {
    this.pageLoading.set(true);

    forkJoin({
      carousel: this.locationService.getCarouselLocations(CAROUSEL_SLIDES),
      trending: this.itineraryService.getPublicItineraries({ trending: true }),
      allPublic: this.itineraryService.getPublicItineraries(),
      creators: this.profileService.getTopCreators(TOP_CREATORS_LIMIT),
      nearby: this.itineraryService.getNearbyPublicItineraries()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ carousel, trending, allPublic, creators, nearby }) => {
        this.carouselPlaces.set(carousel ?? []);
        this.topLikedTrips.set((trending ?? []).slice(0, TOP_TRIPS_LIMIT));

        const latest = [...(allPublic ?? [])].sort((a, b) => {
          const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return tb - ta;
        });
        this.latestTrips.set(latest.slice(0, LATEST_LIMIT));

        this.topCreators.set(creators ?? []);
        this.nearbyAnchor.set(nearby.anchorLocation);
        this.nearbyTrips.set((nearby.itineraries ?? []).slice(0, NEARBY_LIMIT));

        const first =
          this.topLikedTrips().find((t) => t.location?.latitude != null) ??
          this.latestTrips().find((t) => t.location?.latitude != null) ??
          this.topLikedTrips()[0];
        if (first?.id) {
          this.selectedTripId.set(first.id);
          this.loadRoute(first.id);
        }

        this.pageLoading.set(false);
      });
  }

  private loadRoute(itineraryId: number): void {
    this.routeLoading.set(true);
    this.itineraryService
      .getPublicItineraryRoute(itineraryId)
      .pipe(
        finalize(() => this.routeLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((route) => {
        this.routePoints.set(route?.points ?? []);
      });
  }

  private startCarousel(): void {
    this.carouselTimer = setInterval(() => {
      const count = this.carouselPlaces().length;
      if (count <= 1) return;
      this.activeSlide.update((i) => (i + 1) % count);
    }, CAROUSEL_INTERVAL_MS);
  }

  private stopCarousel(): void {
    if (this.carouselTimer) clearInterval(this.carouselTimer);
  }

  goToSlide(index: number): void {
    this.activeSlide.set(index);
    this.stopCarousel();
    this.startCarousel();
  }

  carouselImage(place: Location): string {
    return place.image || FALLBACK_COVER;
  }

  filterByCarouselPlace(): void {
    const place = this.activeCarouselPlace();
    if (!place?.id) return;
    this.searchControl.setValue(place.name);
    this.submitSearch();
  }

  openZoneFromTrip(trip: Itinerary, event: MouseEvent): void {
    event.stopPropagation();
    const locationId = trip.locationId ?? trip.location?.id;
    if (!locationId) return;
    this.openZoneForLocationId(locationId);
  }

  openZoneForLocation(place: Location): void {
    if (!place.id) return;
    this.openZoneForLocationId(place.id);
  }

  private openZoneForLocationId(locationId: number): void {
    this.mapViewMode.set('zone');
    this.zoneLoading.set(true);
    this.zoneFilterType.set('all');
    this.zoneFilterCategory.set('all');

    this.itineraryService
      .getWorkspace(locationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ws) => {
        this.zoneWorkspace.set(ws);
        this.zoneLoading.set(false);
      });
  }

  selectZonePill(pill: ZoneCategoryPill): void {
    this.zoneFilterType.set(pill.type);
    this.zoneFilterCategory.set(pill.categoryId);
  }

  showItineraryRoute(): void {
    this.mapViewMode.set('route');
  }

  submitSearch(): void {
    const term = this.searchControl.value.trim();
    if (term.length < MIN_SEARCH_LENGTH) return;

    this.searchPending.set(true);
    this.searchSubmitted.set(true);
    this.scrollToTop();

    forkJoin({
      trips: this.itineraryService.getPublicItineraries({ q: term }),
      users: this.profileService.searchUsers(term, 50)
    })
      .pipe(
        catchError(() =>
          of({ trips: [] as Itinerary[], users: [] as UserProfileFull[] })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ trips, users }) => {
        this.searchResultTrips.set(trips ?? []);
        this.searchUsers.set(users ?? []);
        this.searchPlaces.set([]);

        // Auto-select best tab: prefer itinerari, fall back to utenti
        if ((trips?.length ?? 0) === 0 && (users?.length ?? 0) > 0) {
          this.activeSearchTab.set('utenti');
        } else {
          this.activeSearchTab.set('itinerari');
        }

        this.searchPending.set(false);
      });
  }

  onSearchInput(): void {
    if (this.searchControl.value.trim().length === 0 && this.searchSubmitted()) {
      this.exitSearchResults();
    }
  }

  backToVetrina(): void {
    this.searchControl.setValue('');
    this.exitSearchResults();
  }

  private exitSearchResults(): void {
    this.searchSubmitted.set(false);
    this.searchPending.set(false);
    this.searchResultTrips.set([]);
    this.searchUsers.set([]);
    this.searchPlaces.set([]);
    this.mapViewMode.set('route');

    const first =
      this.topLikedTrips().find((t) => t.location?.latitude != null) ??
      this.latestTrips().find((t) => t.location?.latitude != null) ??
      this.topLikedTrips()[0];
    if (first?.id) {
      this.selectedTripId.set(first.id);
      this.loadRoute(first.id);
    }
    this.scrollToTop();
  }

  private scrollToTop(): void {
    if (typeof window === 'undefined') return;
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  }

  closeSearch(): void {
    this.backToVetrina();
  }

  setSearchTab(tab: SearchTab): void {
    this.activeSearchTab.set(tab);
  }

  selectTrip(trip: Itinerary): void {
    if (!trip.id) return;
    this.mapViewMode.set('route');
    this.selectedTripId.set(trip.id);
    this.loadRoute(trip.id);
  }

  private categoryIcon(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('muse') || n.includes('monument') || n.includes('storico')) return 'bi-bank';
    if (n.includes('food') || n.includes('risto') || n.includes('cucina')) return 'bi-cup-hot';
    if (n.includes('night') || n.includes('club')) return 'bi-moon-stars';
    if (n.includes('park') || n.includes('parco') || n.includes('nature')) return 'bi-tree';
    if (n.includes('shop') || n.includes('negozi')) return 'bi-bag';
    if (n.includes('sport') || n.includes('fitness')) return 'bi-trophy';
    if (n.includes('spa') || n.includes('wellness')) return 'bi-flower2';
    if (n.includes('arte') || n.includes('galler')) return 'bi-palette';
    if (n.includes('beach') || n.includes('spiaggia')) return 'bi-water';
    if (n.includes('chies') || n.includes('cattedral')) return 'bi-bell';
    return 'bi-geo-alt-fill';
  }

  openPreview(trip: Itinerary, event: MouseEvent): void {
    event.stopPropagation();
    if (!trip.id) return;
    void this.router.navigate(['/itineraries/preview'], {
      queryParams: { itineraryId: trip.id }
    });
  }

  openProfile(user: UserProfileFull): void {
    if (!user.id) return;
    void this.router.navigate(['/profile', user.id]);
  }

  openAuthorProfile(trip: Itinerary, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!trip.user?.id) return;
    void this.router.navigate(['/profile', trip.user.id]);
  }

  toggleFollow(user: UserProfileFull, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!user.id) return;

    if (!this.isLoggedIn()) {
      void this.router.navigate(['/login']);
      return;
    }

    const request = user.isFollowing
      ? this.profileService.unfollowUser(user.id)
      : this.profileService.followUser(user.id);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((res) => {
      if (!res?.success) return;
      const patch = (list: UserProfileFull[]) =>
        list.map((u) => (u.id === user.id ? { ...u, isFollowing: !user.isFollowing } : u));
      this.topCreators.update(patch);
      this.searchUsers.update(patch);
    });
  }

  tripCover(trip: Itinerary): string {
    return trip.imageUrl || trip.location?.image || FALLBACK_COVER;
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

  authorName(trip: Itinerary): string {
    const p = trip.user?.profile;
    return `${p?.name ?? ''} ${p?.surname ?? ''}`.trim() || 'Community SmartFare';
  }

  creatorAvatarUrl(trip: Itinerary): string | null {
    return trip.user?.profile?.avatarUrl ?? null;
  }

  creatorInitials(trip: Itinerary): string {
    const name = this.authorName(trip);
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  stopCount(trip: Itinerary): number {
    return trip._count?.items ?? trip.items?.length ?? 0;
  }

  likeCount(trip: Itinerary): number {
    return trip._count?.favorites ?? 0;
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

  publishedLabel(user: UserProfileFull): string {
    if (!user.lastPublishedAt) return 'Attivo di recente';
    const days = Math.floor((Date.now() - new Date(user.lastPublishedAt).getTime()) / 86400000);
    if (days <= 0) return 'Pubblicato oggi';
    if (days === 1) return 'Pubblicato ieri';
    if (days < 7) return `${days} giorni fa`;
    if (days < 30) return `${Math.floor(days / 7)} sett. fa`;
    return `${Math.floor(days / 30)} mesi fa`;
  }

  isTripSelected(trip: Itinerary): boolean {
    return trip.id != null && trip.id === this.selectedTripId();
  }

  uploadedLabel(trip: Itinerary): string {
    if (!trip.updatedAt) return 'Di recente';
    const days = Math.floor((Date.now() - new Date(trip.updatedAt).getTime()) / 86400000);
    if (days <= 0) return 'Caricato oggi';
    if (days === 1) return 'Caricato ieri';
    if (days < 7) return `${days} giorni fa`;
    return `${Math.floor(days / 7)} sett. fa`;
  }

  placeSubtitle(place: Location): string {
    return place.province ? `${place.province} / ${place.publicItineraryCount ?? 0} itinerari` : 'Italia';
  }
}
