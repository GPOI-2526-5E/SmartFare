import { Component } from '@angular/core';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.css',
})
export class BookingFormComponent {
  readonly bookingTypes = [
    { label: 'Hotel', icon: 'bi-building' },
    { label: 'Tours', icon: 'bi-globe2' },
    { label: 'Activity', icon: 'bi-map' },
    { label: 'Rental', icon: 'bi-house-heart' },
    { label: 'Car', icon: 'bi-car-front' },
    { label: 'Yacht', icon: 'bi-sailboat' },
    { label: 'Flights', icon: 'bi-airplane' },
  ];

  activeType = this.bookingTypes[0]?.label ?? '';

  readonly destinationPlaceholder = 'Where are you going?';
  readonly today = new Date().toISOString().split('T')[0];

  setActiveType(label: string): void {
    this.activeType = label;
  }

  onSubmit(event: Event): void {
    event.preventDefault();
  }
}
