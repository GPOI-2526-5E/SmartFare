import { Component, input, output } from '@angular/core';
import { HotelCard } from '../../../core/models/hotel-booking.models';

@Component({
  selector: 'app-hotel-result-card',
  standalone: true,
  templateUrl: './hotel-result-card.component.html',
  styleUrl: './hotel-result-card.component.css',
})
export class HotelResultCardComponent {
  readonly hotel = input.required<HotelCard>();
  readonly selected = input<boolean>(false);
  readonly selectHotel = output<HotelCard>();
  readonly openMapWithHotel = output<HotelCard>();
}
