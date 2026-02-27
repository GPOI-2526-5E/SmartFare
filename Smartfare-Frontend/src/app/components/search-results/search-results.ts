import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-results.html',
  styleUrl: './search-results.css',
})
export class SearchResults {
  isLoading = signal(true);

  results = signal([
    {
      id: 1,
      type: 'flight',
      departure: 'Milano Malpensa',
      arrival: 'Roma Fiumicino',
      departureTime: '10:30',
      arrivalTime: '12:00',
      duration: '1h 30m',
      price: 89,
      airline: 'ITA Airways',
      class: 'Economy'
    },
    {
      id: 2,
      type: 'flight',
      departure: 'Milano Malpensa',
      arrival: 'Roma Fiumicino',
      departureTime: '14:15',
      arrivalTime: '15:45',
      duration: '1h 30m',
      price: 95,
      airline: 'Ryanair',
      class: 'Economy'
    },
    {
      id: 3,
      type: 'flight',
      departure: 'Milano Malpensa',
      arrival: 'Roma Fiumicino',
      departureTime: '18:00',
      arrivalTime: '19:30',
      duration: '1h 30m',
      price: 120,
      airline: 'Alitalia',
      class: 'Economy'
    }
  ]);

  constructor(private router: Router) {
    // Simula caricamento
    setTimeout(() => this.isLoading.set(false), 1500);
  }

  goBack() {
    this.router.navigate(['/']);
  }

  selectResult(id: number) {
    console.log('Selected result:', id);
    // Qui integrerai con il backend
  }
}
