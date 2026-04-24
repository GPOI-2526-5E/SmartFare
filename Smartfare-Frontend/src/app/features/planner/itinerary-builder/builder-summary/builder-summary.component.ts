import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Itinerary, ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { BuilderPoi } from '../builder.types';
import { ItineraryService } from '../../../../core/services/itinerary.service';

@Component({
  selector: 'app-builder-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './builder-summary.component.html',
  styleUrl: './builder-summary.component.css'
})
export class BuilderSummaryComponent {
  @Input() workspace: ItineraryWorkspace | null = null;
  @Input() savedPois: BuilderPoi[] = [];

  private itineraryService = inject(ItineraryService);
  itinerary = this.itineraryService.itinerary;

  accommodations = computed(() => this.savedPois.filter(p => p.type === 'accommodation'));
  activities = computed(() => this.savedPois.filter(p => p.type === 'activity'));

  getTotalItems() {
    return this.savedPois.length;
  }

  getDaysCount() {
    const itin = this.itinerary();
    if (!itin || !itin.startDate || !itin.endDate) return 0;
    
    const start = new Date(itin.startDate);
    const end = new Date(itin.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}
