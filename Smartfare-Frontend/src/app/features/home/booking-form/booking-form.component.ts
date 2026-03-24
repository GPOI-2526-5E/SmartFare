import { Component, signal, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.css']
})

export class BookingFormComponent {
  @Input() activeType = signal('ITINERARY');
  from = signal('');
  to = signal('');
  date = signal('');

  bookingTypes = [
    { id: 'ITINERARY', label: 'Itinerario', icon: 'bi-map-fill' },
    { id: 'FLIGHT', label: 'Voli', icon: 'bi-airplane-fill' },
    { id: 'TRAIN', label: 'Treni', icon: 'bi-train-front-fill' },
    { id: 'HOTEL', label: 'Hotel', icon: 'bi-building-fill' }
  ];

  serviceConfig: any = {
    'ITINERARY': {
      title: 'Crea il tuo itinerario',
      fromLabel: 'Partenza',
      toLabel: 'Destinazione',
      dateLabel: 'Data di inizio',
      buttonText: 'Pianifica Itinerario'
    },
    'FLIGHT': {
      title: 'Cerca voli',
      fromLabel: 'Da dove?',
      toLabel: 'Per dove?',
      dateLabel: 'Quando?',
      buttonText: 'Cerca Voli'
    },
    'TRAIN': {
      title: 'Trova treni',
      fromLabel: 'Stazione di partenza',
      toLabel: 'Stazione di arrivo',
      dateLabel: 'Data del viaggio',
      buttonText: 'Cerca Treni'
    },
    'HOTEL': {
      title: 'Prenota hotel',
      fromLabel: 'Città',
      toLabel: 'Zona',
      dateLabel: 'Check-in',
      buttonText: 'Cerca Hotel'
    }
  };

  get currentConfig() {
    return this.serviceConfig[this.activeType()] || this.serviceConfig['ITINERARY'];
  }

  constructor(private router: Router) { }

  setActiveType(id: string) {
    this.activeType.set(id);
  }

  search() {
    if (this.from() && this.to() && this.date()) {
      // Naviga ai risultati di ricerca
      this.router.navigate(['/search'], {
        queryParams: {
          from: this.from(),
          to: this.to(),
          date: this.date(),
          type: this.activeType()
        }
      });
    }
  }
}
