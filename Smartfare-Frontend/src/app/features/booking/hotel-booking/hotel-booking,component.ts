import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { HotelFiltersBarComponent } from '../hotel-filters-bar/hotel-filters-bar.component';
import { HotelMapPanelComponent } from '../hotel-map-panel/hotel-map-panel.component';
import { HotelResultsListComponent } from '../hotel-results-list/hotel-results-list.component';
import { HotelSearchBarComponent } from '../hotel-search-bar/hotel-search-bar.component';
import { HotelCard } from '../../../core/models/hotel-booking.models';
import { HotelSearchCriteria } from '../../../core/models/hotel-search.model';
import Location from '../../../core/models/location.model';
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
  locations = signal<Location[]>([]);
  hotelSearch: HotelSearchCriteria = {
    destination: '',
    checkin: '',
    checkout: '',
    guests: 2,
    userPreference: '',
  };

  readonly filters = [
    'Recommended',
    'Price',
    'Stars',
    'Guest Rating',
    'Distance',
    'Top Reviewed',
  ];

  readonly hotels: HotelCard[] = [
    {
      name: 'Comfortable Office Space',
      area: 'Canary Wharf',
      country: 'Greater London, United Kingdom',
      rating: '4.8 Excellent',
      reviews: '48 reviews',
      price: '£899.00',
      accent: '#3f83f8',
      image: 'url("/assets/home-section.avif")',
      badge: 'Popular choice',
      features: [
        { icon: 'bi bi-aspect-ratio', label: '4800 sq ft' },
        { icon: 'bi bi-building', label: '4 Rooms' },
        { icon: 'bi bi-droplet', label: '2 bathrooms' },
        { icon: 'bi bi-bed', label: '6 Beds' },
      ],
    },
    {
      name: 'Sunny, Modern Room in Village!',
      area: 'Richmond Riverside',
      country: 'Greater London, United Kingdom',
      rating: '4.6 Excellent',
      reviews: '71 reviews',
      price: '£799.00',
      accent: '#22a06b',
      image: 'url("/assets/hero-bg.jpg")',
      badge: 'Breakfast included',
      features: [
        { icon: 'bi bi-aspect-ratio', label: '4100 sq ft' },
        { icon: 'bi bi-building', label: '4 Rooms' },
        { icon: 'bi bi-droplet', label: '2 bathrooms' },
        { icon: 'bi bi-bed', label: '5 Beds' },
      ],
    },
    {
      name: 'Large And Modern Bedroom',
      area: 'Kensington Gardens',
      country: 'Greater London, United Kingdom',
      rating: '4.9 Exceptional',
      reviews: '103 reviews',
      price: '£999.00',
      accent: '#f59e0b',
      image: 'linear-gradient(135deg, rgba(6, 32, 71, 0.55), rgba(12, 96, 152, 0.25)), url("/assets/home-section.avif")',
      badge: 'Top reviewed',
      features: [
        { icon: 'bi bi-aspect-ratio', label: '5200 sq ft' },
        { icon: 'bi bi-building', label: '5 Rooms' },
        { icon: 'bi bi-droplet', label: '3 bathrooms' },
        { icon: 'bi bi-bed', label: '7 Beds' },
      ],
    },
  ];

  toggleMap(): void {
    this.showMap = !this.showMap;
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
    });

    this.smartfareService.GetLocations().subscribe({
      next: (res) => {
        this.locations.set(res);
      },
      error: (error) => {
        console.error(error);
      },
    });
  }
}
