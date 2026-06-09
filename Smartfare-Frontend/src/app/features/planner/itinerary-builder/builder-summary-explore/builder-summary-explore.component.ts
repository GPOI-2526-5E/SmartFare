import { ChangeDetectionStrategy, Component, EventEmitter, Output, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Itinerary, ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { ItineraryService } from '../../../../core/services/itinerary.service';
import { ItineraryCardComponent } from '../../../itinerary-card/itinerary-card.component';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-builder-summary-explore',
  standalone: true,
  imports: [CommonModule, ItineraryCardComponent, RouterLink],
  templateUrl: './builder-summary-explore.component.html',
  styleUrls: ['./builder-summary-explore.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BuilderSummaryExploreComponent {
  workspace = input<ItineraryWorkspace | null>(null);

  @Output() previewRequested = new EventEmitter<Itinerary>();

  private itineraryService = inject(ItineraryService);

  publicItineraries = signal<Itinerary[]>([]);

  constructor() {
    effect(() => {
      const ws = this.workspace();
      if (ws?.location?.id) {
        this.itineraryService.getPublicItineraries({ locationId: ws.location.id }).subscribe(list => {
          const randomThree = [...list].sort(() => 0.5 - Math.random()).slice(0, 3);
          this.publicItineraries.set(randomThree);
        });
      }
    });
  }

  onPreviewClick(itin: Itinerary) {
    this.previewRequested.emit(itin);
  }
}
