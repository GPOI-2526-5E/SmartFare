import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Itinerary } from '../../../core/models/itinerary.model';
import { AppLoaderComponent } from '../../ui/loader/loader.component';
import { ItineraryCardComponent } from '../../itinerary-card/itinerary-card.component';

@Component({
  selector: 'app-featured-itineraries',
  standalone: true,
  imports: [CommonModule, RouterLink, AppLoaderComponent, ItineraryCardComponent],
  templateUrl: './featured-itineraries.component.html',
  styleUrl: './featured-itineraries.component.css'
})
export class FeaturedItinerariesComponent {
  @Input({ required: true }) itineraries: Itinerary[] = [];
  @Input() loading = false;


  trackById(_index: number, item: Itinerary) {
    return item.id;
  }
}
