import { Component, signal } from '@angular/core';
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
  activeType = signal('FLIGHT');
  from = signal('');
  to = signal('');
  date = signal('');

  bookingTypes = [
    { id: 'FLIGHT', label: 'Voli', icon: 'bi-airplane-fill' },
    { id: 'TRAIN', label: 'Treni', icon: 'bi-train-front-fill' },
    { id: 'HOTEL', label: 'Hotel', icon: 'bi-building-fill' }
  ];

  constructor(private router: Router) {}

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
