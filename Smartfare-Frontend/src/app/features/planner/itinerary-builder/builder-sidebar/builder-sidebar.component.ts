import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UIStateService } from '../../../../core/services/ui-state.service';
import { ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { BuilderPoi } from '../builder.types';

@Component({
  selector: 'app-builder-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './builder-sidebar.component.html',
  styleUrl: './builder-sidebar.component.css'
})
export class BuilderSidebarComponent {
  private workspaceSignal = signal<ItineraryWorkspace | null>(null);
  private savedPoiKeysSignal = signal<Set<string>>(new Set<string>());
  searchTerm = signal('');

  @Input({ required: true })
  set workspace(value: ItineraryWorkspace | null) {
    this.workspaceSignal.set(value);
  }
  get workspace(): ItineraryWorkspace | null {
    return this.workspaceSignal();
  }

  @Input()
  set savedPoiKeys(value: Set<string>) {
    this.savedPoiKeysSignal.set(value || new Set<string>());
  }
  get savedPoiKeys(): Set<string> {
    return this.savedPoiKeysSignal();
  }

  @Output() focusSidebar = new EventEmitter<void>();
  @Output() previewPoi = new EventEmitter<BuilderPoi>();
  @Output() addPoi = new EventEmitter<BuilderPoi>();

  ui = inject(UIStateService);

  readonly poiList = computed(() => {
    const workspace = this.workspaceSignal();
    if (!workspace) return [] as BuilderPoi[];

    const accommodations: BuilderPoi[] = workspace.accommodations.map((acc) => ({
      key: `accommodation-${acc.id}`,
      type: 'accommodation' as const,
      entityId: acc.id,
      title: acc.name,
      subtitle: acc.street || 'Hotel',
      latitude: acc.latitude,
      longitude: acc.longitude,
      itemTypeCode: 'ACCOMMODATION' as const,
      imageUrl: acc.imageUrl,
      price: acc.pricePerNight,
      rating: acc.stars
    }));

    const activities: BuilderPoi[] = workspace.activities.map((activity) => ({
      key: `activity-${activity.id}`,
      type: 'activity' as const,
      entityId: activity.id,
      title: activity.name,
      subtitle: activity.category?.name || activity.street || 'Attività',
      latitude: activity.latitude,
      longitude: activity.longitude,
      categoryId: activity.categoryId,
      categoryName: activity.category?.name,
      itemTypeCode: 'ACTIVITY' as const,
      imageUrl: activity.imageUrl,
      price: activity.price,
      rating: activity.rating
    }));

    return [...accommodations, ...activities];
  });

  readonly filteredList = computed(() => {
    const selectedType = this.ui.selectedType();
    const selectedCategory = this.ui.selectedCategory();
    const term = this.searchTerm().toLowerCase().trim();

    return this.poiList().filter((poi) => {
      if (selectedType !== 'all' && poi.type !== selectedType) return false;
      if (selectedCategory !== 'all' && poi.type === 'activity' && poi.categoryId !== selectedCategory) return false;
      
      if (term) {
        return poi.title.toLowerCase().includes(term) || 
               (poi.subtitle && poi.subtitle.toLowerCase().includes(term));
      }
      
      return true;
    });
  });

  setType(type: 'all' | 'accommodation' | 'activity') {
    this.ui.setType(type);
    this.focusSidebar.emit();
  }

  setCategory(value: string) {
    if (value === 'all') {
      this.ui.setCategory('all');
    } else {
      this.ui.setCategory(Number(value));
    }
    this.focusSidebar.emit();
  }

  onPreview(poi: BuilderPoi) {
    this.previewPoi.emit(poi);
    this.focusSidebar.emit();
  }

  onAdd(poi: BuilderPoi) {
    this.addPoi.emit(poi);
    this.focusSidebar.emit();
  }

  isSaved(poi: BuilderPoi): boolean {
    return this.savedPoiKeysSignal().has(poi.key);
  }

  starsArray(n: number): number[] {
    return Array.from({ length: Math.max(0, Math.min(5, n)) });
  }

  emptyStarsArray(n: number): number[] {
    return Array.from({ length: Math.max(0, 5 - Math.min(5, n)) });
  }
}
