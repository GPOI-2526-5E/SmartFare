import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-hotel-filters-bar',
  standalone: true,
  templateUrl: './hotel-filters-bar.component.html',
  styleUrl: './hotel-filters-bar.component.css',
})
export class HotelFiltersBarComponent {
  readonly filters = input.required<string[]>();
  readonly showMap = input.required<boolean>();
  readonly selectedFilter = input.required<string>();
  readonly totalResults = input.required<number>();
  readonly toggleMap = output<void>();
  readonly selectFilter = output<string>();
}
