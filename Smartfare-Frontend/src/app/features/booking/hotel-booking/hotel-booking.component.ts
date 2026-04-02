import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { HotelFiltersBarComponent } from '../hotel-filters-bar/hotel-filters-bar.component';
import { HotelMapPanelComponent } from '../hotel-map-panel/hotel-map-panel.component';
import { HotelResultsListComponent } from '../hotel-results-list/hotel-results-list.component';
import { HotelSearchBarComponent } from '../hotel-search-bar/hotel-search-bar.component';
import {
  HotelCard,
  HotelSearchAnalysis,
  HotelSearchApiOffer,
  HotelSearchRecommendation,
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
  ) { }

  showMap = true;
  mapDrawerOpen = false;
  isLoading = false;
  errorMessage = '';
  totalResults = 0;
  totalPages = 1;
  currentPage = 1;
  readonly pageSize = 10;
  selectedFilter = 'Recommended';
  minimumStars = 0;
  onlyAiChoice = false;
  onlyWithCoordinates = false;
  minimumAvailableRooms = 0;
  selectedServices: string[] = [];
  availableServices: string[] = [];
  selectedMaxPrice = 0;
  priceBounds = { min: 0, max: 0 };
  analysis?: HotelSearchAnalysis;
  recommendation?: HotelSearchRecommendation;

  hotelSearch: HotelSearchCriteria = {
    destination: '',
    checkin: '',
    checkout: '',
    guests: 2,
    userPreference: '',
  };

  readonly filters = ['Recommended', 'Price', 'Stars', 'Availability'];

  private pageHotels: HotelCard[] = [];
  hotels: HotelCard[] = [];
  selectedHotel: HotelCard | null = null;

  toggleMap(): void {
    this.showMap = true;
    this.mapDrawerOpen = !this.mapDrawerOpen;
  }

  openMapDrawer(): void {
    this.showMap = true;
    this.mapDrawerOpen = true;
  }

  closeMapDrawer(): void {
    this.mapDrawerOpen = false;
  }

  selectFilter(filter: string): void {
    this.selectedFilter = filter;
    this.applySelectedFilterAndSideFilters();
  }

  selectHotel(hotel: HotelCard): void {
    this.selectedHotel = hotel;
  }

  openMapWithHotel(hotel: HotelCard): void {
    this.selectedHotel = hotel;
    this.openMapDrawer();
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

    queryParams['page'] = 1;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  onMaxPriceChange(value: number): void {
    this.selectedMaxPrice = value;
    this.applySelectedFilterAndSideFilters();
  }

  onMinimumStarsChange(value: number): void {
    this.minimumStars = value;
    this.applySelectedFilterAndSideFilters();
  }

  onOnlyAiChoiceChange(value: boolean): void {
    this.onlyAiChoice = value;
    this.applySelectedFilterAndSideFilters();
  }

  onOnlyWithCoordinatesChange(value: boolean): void {
    this.onlyWithCoordinates = value;
    this.applySelectedFilterAndSideFilters();
  }

  onMinimumAvailableRoomsChange(value: number): void {
    this.minimumAvailableRooms = value;
    this.applySelectedFilterAndSideFilters();
  }

  toggleService(service: string): void {
    if (!service) {
      return;
    }

    if (this.selectedServices.includes(service)) {
      this.selectedServices = this.selectedServices.filter((item) => item !== service);
    } else {
      this.selectedServices = [...this.selectedServices, service];
    }

    this.applySelectedFilterAndSideFilters();
  }

  clearSelectedServices(): void {
    this.selectedServices = [];
    this.applySelectedFilterAndSideFilters();
  }

  resetFilters(): void {
    this.selectedFilter = 'Recommended';
    this.minimumStars = 0;
    this.onlyAiChoice = false;
    this.onlyWithCoordinates = false;
    this.minimumAvailableRooms = 0;
    this.selectedServices = [];
    this.selectedMaxPrice = this.priceBounds.max;
    this.applySelectedFilterAndSideFilters();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  get paginationPages(): number[] {
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, start + 4);
    const first = Math.max(1, end - 4);
    const pages: number[] = [];

    for (let page = first; page <= end; page++) {
      pages.push(page);
    }

    return pages;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const guestsParam = Number(params.get('guests') ?? 2);
      const pageParam = Number(params.get('page') ?? 1);

      this.hotelSearch = {
        destination: params.get('destination') ?? '',
        checkin: params.get('checkin') ?? '',
        checkout: params.get('checkout') ?? '',
        guests: Number.isFinite(guestsParam) && guestsParam > 0 ? guestsParam : 2,
        userPreference: params.get('userPreference') ?? '',
      };
      this.currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

      if (this.hotelSearch.destination && this.hotelSearch.checkin && this.hotelSearch.checkout) {
        this.fetchHotels();
      }
    });
  }

  private fetchHotels(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.smartfareService.searchHotels(this.hotelSearch, this.currentPage, this.pageSize).subscribe({
      next: (response) => {
        this.totalResults = response.total;
        this.totalPages = Math.max(1, response.totalPages ?? 1);
        this.analysis = response.analysis;
        this.recommendation = response.recommendation;

        this.pageHotels = response.offers.map((offer) => this.mapOfferToCard(offer, response.analysis?.bestOffer?.hotelId));
        this.updateServiceOptions();
        this.updatePriceBounds();
        this.applySelectedFilterAndSideFilters();
        this.selectedHotel = this.hotels[0] ?? null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error(error);
        this.errorMessage = 'Non sono riuscito a caricare gli hotel. Riprova tra poco.';
        this.pageHotels = [];
        this.hotels = [];
        this.availableServices = [];
        this.selectedServices = [];
        this.analysis = undefined;
        this.recommendation = undefined;
        this.selectedHotel = null;
        this.totalResults = 0;
        this.totalPages = 1;
        this.isLoading = false;
      },
    });
  }

  private updatePriceBounds(): void {
    if (this.pageHotels.length === 0) {
      this.priceBounds = { min: 0, max: 0 };
      this.selectedMaxPrice = 0;
      return;
    }

    const prices = this.pageHotels.map((hotel) => hotel.priceValue);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    this.priceBounds = { min, max };

    if (this.selectedMaxPrice <= 0 || this.selectedMaxPrice > max) {
      this.selectedMaxPrice = max;
    }
  }

  private applySelectedFilterAndSideFilters(): void {
    const filteredHotels = this.pageHotels.filter((hotel) => {
      if (hotel.priceValue > this.selectedMaxPrice) {
        return false;
      }

      if (hotel.stars < this.minimumStars) {
        return false;
      }

      if (this.onlyAiChoice && !hotel.isAiChoice) {
        return false;
      }

      if (this.onlyWithCoordinates && (!hotel.latitude || !hotel.longitude)) {
        return false;
      }

      if (hotel.availableRooms < this.minimumAvailableRooms) {
        return false;
      }

      if (this.selectedServices.length > 0) {
        const normalizedServices = hotel.services.map((service) => service.toLowerCase());
        const hasAllRequiredServices = this.selectedServices.every((selectedService) =>
          normalizedServices.includes(selectedService.toLowerCase())
        );

        if (!hasAllRequiredServices) {
          return false;
        }
      }

      return true;
    });

    const sortedHotels = [...filteredHotels];

    switch (this.selectedFilter) {
      case 'Price':
        sortedHotels.sort((first, second) => first.priceValue - second.priceValue);
        break;
      case 'Stars':
        sortedHotels.sort((first, second) => second.stars - first.stars || first.priceValue - second.priceValue);
        break;
      case 'Availability':
        sortedHotels.sort((first, second) => second.availableRooms - first.availableRooms);
        break;
      default:
        sortedHotels.sort((first, second) => {
          const recommendationWeight = Number(second.isAiChoice) - Number(first.isAiChoice);
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

  private updateServiceOptions(): void {
    const uniqueServices = new Set<string>();

    for (const hotel of this.pageHotels) {
      for (const service of hotel.services) {
        const normalizedService = String(service ?? '').trim();
        if (normalizedService) {
          uniqueServices.add(normalizedService);
        }
      }
    }

    this.availableServices = Array.from(uniqueServices)
      .sort((first, second) => first.localeCompare(second, 'it', { sensitivity: 'base' }))
      .slice(0, 14);
    this.selectedServices = this.selectedServices.filter((service) => this.availableServices.includes(service));
  }

  private mapOfferToCard(offer: HotelSearchApiOffer, bestOfferHotelId?: number): HotelCard {
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
      stars: offer.stars,
      rating: starsLabel,
      reviews: offer.availableRooms > 1 ? `${offer.availableRooms} opzioni disponibili` : '1 opzione disponibile',
      price: `€${offer.minPricePerNight}`,
      priceValue: offer.minPricePerNight,
      totalPrice: offer.minTotalPrice,
      nights: offer.nights,
      accent: this.pickAccent(offer, bestOfferHotelId),
      image: this.buildHotelImage(offer),
      previewImage: this.buildHotelImage(offer),
      badge: this.buildHotelBadge(offer, bestOfferHotelId),
      latitude: offer.latitude,
      longitude: offer.longitude,
      roomType: offer.bestRoom.roomType,
      roomTypes: offer.roomTypes,
      availableRooms: offer.availableRooms,
      services: offer.services,
      isAiChoice: bestOfferHotelId === offer.hotelId,
      features: featureBase,
    };
  }

  private buildHotelBadge(offer: HotelSearchApiOffer, bestOfferHotelId?: number): string {
    if (bestOfferHotelId === offer.hotelId) {
      return 'Scelta IA';
    }

    if (offer.minPricePerNight <= 40) {
      return 'Miglior prezzo';
    }

    if (offer.stars >= 4) {
      return 'Top comfort';
    }

    return 'Da vedere';
  }

  private buildHotelImage(offer: HotelSearchApiOffer): string {
    const images = [
      '/assets/home-section.avif',
      '/assets/hotel-template.avif'
    ];

    return images[offer.hotelId % images.length];
  }

  private pickAccent(offer: HotelSearchApiOffer, bestOfferHotelId?: number): string {
    if (bestOfferHotelId === offer.hotelId) {
      return '#22a06b';
    }

    if (offer.stars >= 4) {
      return '#f59e0b';
    }

    if (offer.minPricePerNight <= 100) {
      return '#22a06b';
    }

    return '#3f83f8';
  }
}
