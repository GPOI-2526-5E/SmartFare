import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Airports } from '../../../core/models/flights.model'
import { HotelSearchCriteria } from '../../../core/models/hotel-search.model';
import { HotelSearchBarComponent } from '../../booking/hotel-search-bar/hotel-search-bar.component';
import { SmartfareService } from '../../../core/services/smartfare-api.service';
import { AlertService } from '../../../core/services/alert.service';
@Component({
  selector: 'app-booking-form',
  imports: [CommonModule, FormsModule, HotelSearchBarComponent],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.css',
  standalone: true,
})
export class BookingFormComponent implements OnInit {

  departureAirport: string = '';
  arrivalAirport: string = '';

  constructor(
    private smartfareService: SmartfareService,
    private router: Router,
    private alertService: AlertService
  ) { };

  airports = signal<Airports[]>([]);

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

  onHotelSearch(criteria: HotelSearchCriteria): void {
    const queryParams: Record<string, string | number> = {};

    if (!criteria.destination) {
      return this.alertService.error("Selezionare la destinazione");
    }
    queryParams['destination'] = criteria.destination;

    if (!criteria.checkin) {
      return this.alertService.error("Selezionare la data di checkin");
    }
    queryParams['checkin'] = criteria.checkin;

    if (!criteria.checkout) {
      return this.alertService.error("Selezionare la data di checkout");
    }
    queryParams['checkout'] = criteria.checkout;
    queryParams['guests'] = criteria.guests;

    this.router.navigate(['/hotel'], { queryParams });
  }

  ngOnInit() {
    this.smartfareService.getAirports().subscribe({
      next: (res) => {
        console.log(res);
        this.airports.set(res);
      },
      error: (error) => {
        console.error(error);
      }
    });
  }
}
