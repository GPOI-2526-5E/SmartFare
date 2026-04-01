import { Component, input, output } from '@angular/core';
import { HotelCard } from '../../../core/models/hotel-booking.models';

@Component({
  selector: 'app-hotel-results-list',
  standalone: true,
  templateUrl: './hotel-results-list.component.html',
  styleUrl: './hotel-results-list.component.css',
})
export class HotelResultsListComponent {
  readonly hotels = input.required<HotelCard[]>();
  readonly selectedHotelId = input<number | null>(null);
  readonly selectHotel = output<HotelCard>();
}
