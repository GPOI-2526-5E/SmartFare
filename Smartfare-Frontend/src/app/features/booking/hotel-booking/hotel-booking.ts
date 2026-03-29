import { Component } from '@angular/core';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { HotelFiltersBarComponent } from '../hotel-filters-bar/hotel-filters-bar.component';
import { HotelMapPanelComponent } from '../hotel-map-panel/hotel-map-panel.component';
import { HotelResultsListComponent } from '../hotel-results-list/hotel-results-list.component';
import { HotelSearchBarComponent } from '../hotel-search-bar/hotel-search-bar.component';
import { HotelCard } from '../../../core/models/hotel-booking.models';

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
  templateUrl: './hotel-booking.html',
  styleUrl: './hotel-booking.css',
})
export class HotelBooking {
  showMap = true;

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
}
