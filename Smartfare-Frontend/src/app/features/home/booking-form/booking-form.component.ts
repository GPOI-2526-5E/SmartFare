import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Airports } from '../../../core/models/flights.model'
import { AuthService } from '../../../core/auth/auth.service';
import { SmartfareService } from '../../../core/services/smartfare-api.service';

@Component({
  selector: 'app-booking-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.css',
  standalone: true,
})
export class BookingFormComponent implements OnInit {

  departureAirport: string = '';
  arrivalAirport: string = '';

  constructor(private smartfareService: SmartfareService) { };

  airports = signal<Airports | null>(null);
  locations = signal<Location[] | null>(null);

  readonly bookingTypes = [
    { label: 'Hotel', icon: 'bi-building' },
    { label: 'Flights', icon: 'bi-airplane-engines' },
    { label: 'Trains', icon: 'bi-train-front' },
    { label: 'Bus', icon: 'bi-bus-front' },
    { label: 'Itinerary', icon: 'bi-geo-alt' },
  ];

  activeType = this.bookingTypes[0]?.label ?? '';

  showReturnFlight = signal<boolean>(false);
  showReturnTrain = signal<boolean>(false);

  readonly destinationPlaceholder = 'Where are you going?';
  readonly today = new Date().toISOString().split('T')[0];

  setActiveType(label: string): void {
    this.activeType = label;
    this.showReturnFlight.set(false);
    this.showReturnTrain.set(false);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
  }

  ngOnInit() {
    this.smartfareService.GetAirports().subscribe({
      next: (res) => {
        console.log(res);
        this.airports.set(res.data);
      },
      error: (error) => {
        console.error(error);
      }
    });

    this.smartfareService.GetLocations().subscribe({
      next: (res) => {
        console.log(res);
        this.locations.set(res.data);
      },
      error: (error) => {
        console.log(error);
      }
    })
  }
}
