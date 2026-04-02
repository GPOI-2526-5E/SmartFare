import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-hotel-filters-bar',
  standalone: true,
  templateUrl: './hotel-filters-bar.component.html',
  styleUrl: './hotel-filters-bar.component.css',
})
export class HotelFiltersBarComponent {
  readonly filters = input.required<string[]>();
  readonly totalResults = input.required<number>();
  readonly showMap = input.required<boolean>();
  readonly selectedFilter = input.required<string>();
  readonly minPriceBound = input<number>(0);
  readonly maxPriceBound = input<number>(0);
  readonly selectedMaxPrice = input<number>(0);
  readonly minimumStars = input<number>(0);
  readonly onlyAiChoice = input<boolean>(false);
  readonly onlyWithCoordinates = input<boolean>(false);
  readonly minimumAvailableRooms = input<number>(0);
  readonly availableServices = input<string[]>([]);
  readonly selectedServices = input<string[]>([]);
  readonly toggleMap = output<void>();
  readonly selectFilter = output<string>();
  readonly maxPriceChange = output<number>();
  readonly minStarsChange = output<number>();
  readonly onlyAiChoiceChange = output<boolean>();
  readonly onlyWithCoordinatesChange = output<boolean>();
  readonly minimumAvailableRoomsChange = output<number>();
  readonly toggleService = output<string>();
  readonly clearServices = output<void>();
  readonly resetFilters = output<void>();
}
