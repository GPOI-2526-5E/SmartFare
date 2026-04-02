import { Component, input, output } from '@angular/core';
import { HotelCard } from '../../../core/models/hotel-booking.models';
import { HotelResultCardComponent } from '../hotel-result-card/hotel-result-card.component';

@Component({
  selector: 'app-hotel-results-list',
  standalone: true,
  imports: [HotelResultCardComponent],
  templateUrl: './hotel-results-list.component.html',
  styleUrl: './hotel-results-list.component.css',
})
export class HotelResultsListComponent {
  readonly hotels = input.required<HotelCard[]>();
  readonly selectedHotelId = input<number | null>(null);
  readonly selectHotel = output<HotelCard>();
  readonly openMapWithHotel = output<HotelCard>();
}
