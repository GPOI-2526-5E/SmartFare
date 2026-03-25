import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  selectedExperience = signal('Urban Escape');

  readonly experiences = [
    {
      name: 'Urban Escape',
      icon: 'bi-buildings',
      text: 'Percorsi city-break con trasferimenti fluidi, check-in rapidi e suggerimenti locali in tempo reale.'
    },
    {
      name: 'Mountain Reset',
      icon: 'bi-tree-fill',
      text: 'Modalita outdoor con tappe lente, mix treno+navetta e pacchetti alloggio eco-friendly.'
    },
    {
      name: 'Sea Flow',
      icon: 'bi-water',
      text: 'Soluzioni smart per viaggi costieri, ferry pass, noleggi e supporto meteo adattivo.'
    }
  ];

  readonly featuredTrips = [
    { city: 'Lisbona', tag: 'Sunset Districts', price: 'da 214 EUR', score: '9.4', image: 'https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=1200&q=80' },
    { city: 'Copenhagen', tag: 'Bike + Design Week', price: 'da 189 EUR', score: '9.1', image: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=1200&q=80' },
    { city: 'Marrakech', tag: 'Riad + Atlas Daytrip', price: 'da 276 EUR', score: '9.6', image: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=1200&q=80' }
  ];

  selectExperience(name: string): void {
    this.selectedExperience.set(name);
  }
}
