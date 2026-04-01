import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { HotelFiltersBarComponent } from '../hotel-filters-bar/hotel-filters-bar.component';
import { HotelMapPanelComponent } from '../hotel-map-panel/hotel-map-panel.component';
import { HotelResultsListComponent } from '../hotel-results-list/hotel-results-list.component';
import { HotelSearchBarComponent } from '../hotel-search-bar/hotel-search-bar.component';
import {
  HotelCard,
  HotelSearchApiOffer,
  HotelSearchApiResponse,
} from '../../../core/models/hotel-booking.models';
import { HotelSearchCriteria } from '../../../core/models/hotel-search.model';
import { SmartfareService } from '../../../core/services/smartfare-api.service';

@Component({
  selector: 'app-hotel-booking',
  standalone: true,
  imports: [
    NavbarComponent,
    HotelSearchBarComponent,
    HotelFiltersBarComponent,
    HotelResultsListComponent,
    HotelMapPanelComponent,
  ],
  templateUrl: './hotel-booking.component.html',
  styleUrl: './hotel-booking.component.css',
})
export class HotelBookingComponent implements OnInit {
  constructor(
    private smartfareService: SmartfareService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  showMap = true;
  isLoading = false;
  errorMessage = '';
  totalResults = 0;
  selectedFilter = 'Recommended';

  hotelSearch: HotelSearchCriteria = {
    destination: '',
    checkin: '',
    checkout: '',
    guests: 2,
    userPreference: '',
  };

  readonly filters = ['Recommended', 'Price', 'Stars', 'Availability'];

  private allHotels: HotelCard[] = [];
  hotels: HotelCard[] = [];
  selectedHotel: HotelCard | null = null;

  toggleMap(): void {
    this.showMap = !this.showMap;
  }

  selectFilter(filter: string): void {
    this.selectedFilter = filter;
    this.applySelectedFilter();
  }

  selectHotel(hotel: HotelCard): void {
    this.selectedHotel = hotel;
    if (!this.showMap) {
      this.showMap = true;
    }
  }

  onSearch(criteria: HotelSearchCriteria): void {
    this.hotelSearch = { ...criteria };

    const queryParams: Record<string, string | number> = {};

    if (criteria.destination) {
      queryParams['destination'] = criteria.destination;
    }

    if (criteria.checkin) {
      queryParams['checkin'] = criteria.checkin;
    }

    if (criteria.checkout) {
      queryParams['checkout'] = criteria.checkout;
    }

    if (criteria.guests > 0) {
      queryParams['guests'] = criteria.guests;
    }

    if (criteria.userPreference) {
      queryParams['userPreference'] = criteria.userPreference;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const guestsParam = Number(params.get('guests') ?? 2);

      this.hotelSearch = {
        destination: params.get('destination') ?? '',
        checkin: params.get('checkin') ?? '',
        checkout: params.get('checkout') ?? '',
        guests: Number.isFinite(guestsParam) && guestsParam > 0 ? guestsParam : 2,
        userPreference: params.get('userPreference') ?? '',
      };

      if (this.hotelSearch.destination && this.hotelSearch.checkin && this.hotelSearch.checkout) {
        this.fetchHotels();
      }
    });
  }

  private fetchHotels(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.smartfareService.searchHotels(this.hotelSearch, 1, 30).subscribe({
      next: (response) => {
        this.totalResults = response.total;
        this.allHotels = response.offers.map((offer) => this.mapOfferToCard(offer, response));
        this.applySelectedFilter();
        this.selectedHotel = this.hotels[0] ?? null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error(error);
        this.errorMessage = 'Non sono riuscito a caricare gli hotel. Riprova tra poco.';
        this.allHotels = [];
        this.hotels = [];
        this.selectedHotel = null;
        this.totalResults = 0;
        this.isLoading = false;
      },
    });
  }

  private applySelectedFilter(): void {
    const sortedHotels = [...this.allHotels];

    switch (this.selectedFilter) {
      case 'Price':
        sortedHotels.sort((first, second) => first.priceValue - second.priceValue);
        break;
      case 'Stars':
        sortedHotels.sort((first, second) => this.extractStars(second.rating) - this.extractStars(first.rating));
        break;
      case 'Availability':
        sortedHotels.sort((first, second) => second.availableRooms - first.availableRooms);
        break;
      default:
        sortedHotels.sort((first, second) => {
          const recommendationWeight = Number(Boolean(second.recommendation)) - Number(Boolean(first.recommendation));
          if (recommendationWeight !== 0) {
            return recommendationWeight;
          }

          return first.priceValue - second.priceValue;
        });
        break;
    }

    this.hotels = sortedHotels;
    if (this.selectedHotel) {
      this.selectedHotel = this.hotels.find((hotel) => hotel.hotelId === this.selectedHotel?.hotelId) ?? this.hotels[0] ?? null;
    }
  }

  private mapOfferToCard(offer: HotelSearchApiOffer, response: HotelSearchApiResponse): HotelCard {
    const starsLabel = offer.stars > 0 ? `${offer.stars} stelle` : 'Essenziale';
    const featureBase = [
      { icon: 'bi bi-door-open', label: `${offer.availableRooms} camere disponibili` },
      { icon: 'bi bi-people', label: `Fino a ${offer.bestRoom.roomCapacity} ospiti` },
      { icon: 'bi bi-moon-stars', label: `${offer.nights} notti` },
      { icon: 'bi bi-house-heart', label: offer.bestRoom.roomType },
    ];

    if (offer.services[0]) {
      featureBase[3] = { icon: 'bi bi-stars', label: offer.services[0] };
    }

    return {
      hotelId: offer.hotelId,
      name: offer.name,
      area: offer.city || offer.location || 'Destinazione selezionata',
      country: offer.address,
      rating: starsLabel,
      reviews: offer.availableRooms > 1 ? `${offer.availableRooms} opzioni disponibili` : '1 opzione disponibile',
      price: `€${offer.minPricePerNight}`,
      priceValue: offer.minPricePerNight,
      accent: this.pickAccent(offer),
      image: this.buildHotelImage(offer),
      badge: this.buildHotelBadge(offer, response),
      latitude: offer.latitude,
      longitude: offer.longitude,
      recommendation: response.recommendation?.suggestion || response.analysis?.summary || '',
      roomType: offer.bestRoom.roomType,
      availableRooms: offer.availableRooms,
      services: offer.services,
      features: featureBase,
    };
  }

  private buildHotelBadge(offer: HotelSearchApiOffer, response: HotelSearchApiResponse): string {
    if (response.analysis?.bestOffer?.hotelId === offer.hotelId) {
      return 'Scelta IA';
    }

    if (response.analysis?.cheapestOffer?.hotelId === offer.hotelId) {
      return 'Miglior prezzo';
    }

    if (offer.stars >= 4) {
      return 'Top comfort';
    }

    return 'Da vedere';
  }

  private buildHotelImage(offer: HotelSearchApiOffer): string {
    const gradients = [
      'linear-gradient(135deg, rgba(11, 41, 79, 0.48), rgba(30, 119, 191, 0.24)), url("/assets/home-section.avif")',
      'linear-gradient(135deg, rgba(33, 71, 108, 0.45), rgba(72, 164, 124, 0.20)), url("/assets/hero-bg.jpg")',
      'linear-gradient(135deg, rgba(28, 33, 73, 0.46), rgba(235, 166, 70, 0.16)), url("/assets/home-section.avif")',
    ];

    return gradients[offer.hotelId % gradients.length];
  }

  private pickAccent(offer: HotelSearchApiOffer): string {
    if (offer.stars >= 4) {
      return '#f59e0b';
    }

    if (offer.minPricePerNight <= 100) {
      return '#22a06b';
    }

    return '#3f83f8';
  }

  private extractStars(label: string): number {
    const match = label.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }
}
