import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuilderMapComponent } from '../../itinerary-builder/builder-map/builder-map.component';
import { Itinerary } from '../../../../core/models/itinerary.model';
import Location from '../../../../core/models/location.model';
import { BuilderPoi } from '../../../../core/models/builder.types';

@Component({
  selector: 'app-preview-map-panel',
  standalone: true,
  imports: [CommonModule, BuilderMapComponent],
  templateUrl: './preview-map-panel.component.html',
  styleUrl: './preview-map-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewMapPanelComponent {
  @Input() itinerary: Itinerary | null = null;
  @Input() location: Location | null = null;
  @Input() routePois: BuilderPoi[] = [];
  @Input() canRender = false;
  @Input() isLoading = false;
}
