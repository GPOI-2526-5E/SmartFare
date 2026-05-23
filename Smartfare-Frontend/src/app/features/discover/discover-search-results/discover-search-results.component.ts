import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DiscoverZoneMapComponent } from '../discover-zone-map/discover-zone-map.component';
import { Itinerary } from '../../../core/models/itinerary.model';
import { UserProfileFull } from '../../../core/models/user-profile.model';
import Location from '../../../core/models/location.model';
import { BuilderPoi } from '../../../core/models/builder.types';
import type { SearchTab, ZoneCategoryPill } from '../discover-page/discover-page.component';

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';

@Component({
  selector: 'app-discover-search-results',
  standalone: true,
  imports: [CommonModule, DiscoverZoneMapComponent],
  templateUrl: './discover-search-results.component.html',
  styleUrl: './discover-search-results.component.css'
})
export class DiscoverSearchResultsComponent {
  @Input({ required: true }) searchTitle = '';
  @Input({ required: true }) searchTerm = '';
  @Input() pending = false;
  @Input() activeTab: SearchTab = 'itinerari';
  @Input() trips: Itinerary[] = [];
  @Input() users: UserProfileFull[] = [];
  @Input() places: Location[] = [];
  @Input() mapLocation: Location | null = null;
  @Input() zoneLoading = false;
  @Input() zonePois: BuilderPoi[] = [];
  @Input() zonePills: ZoneCategoryPill[] = [];
  @Input() activeZonePillKey = 'all';

  @Output() back = new EventEmitter<void>();
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<void>();
  @Output() clearSearch = new EventEmitter<void>();
  @Output() tabChange = new EventEmitter<SearchTab>();
  @Output() tripSelect = new EventEmitter<Itinerary>();
  @Output() preview = new EventEmitter<{ trip: Itinerary; event: MouseEvent }>();
  @Output() profileOpen = new EventEmitter<UserProfileFull>();
  @Output() followToggle = new EventEmitter<{ user: UserProfileFull; event: MouseEvent }>();
  @Output() placeSelect = new EventEmitter<Location>();
  @Output() zonePillSelect = new EventEmitter<ZoneCategoryPill>();
  @Output() authorOpen = new EventEmitter<{ trip: Itinerary; event: MouseEvent }>();

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

  placeSubtitle(place: Location): string {
    return place.province ? `${place.province} / ${place.publicItineraryCount ?? 0} itinerari` : 'Italia';
  }
}
