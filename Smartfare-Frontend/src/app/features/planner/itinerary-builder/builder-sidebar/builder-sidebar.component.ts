import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UIStateService } from '../../../../core/services/ui-state.service';
import { ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { ActivityCategory } from '../../../../core/models/activity.model';
import { BuilderPoi } from '../builder.types';

type SidebarRailItem = {
  key: string;
  label: string;
  icon: string;
  iconValue?: string;
  type: 'all' | 'accommodation' | 'activity';
  categoryId: number | 'all';
};

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

  readonly railItems = computed(() => {
    const workspace = this.workspaceSignal();
    const availableCategoryIds = new Set((workspace?.activities || []).map((activity) => activity.categoryId));
    const items: SidebarRailItem[] = [
      {
        key: 'all',
        label: 'Tutto',
        icon: 'bi bi-grid-3x3-gap-fill',
        type: 'all',
        categoryId: 'all'
      },
      {
        key: 'hotel',
        label: 'Hotel',
        icon: 'bi bi-building',
        type: 'accommodation',
        categoryId: 'all'
      }
    ];

    for (const category of workspace?.categories || []) {
      if (availableCategoryIds.has(category.id)) {
        items.push(this.toRailItem(category));
      }
    }

    return items;
  });

  readonly activeRailItem = computed(() => {
    const selectedType = this.ui.selectedType();
    const selectedCategory = this.ui.selectedCategory();

    if (selectedType === 'all') return 'all';
    if (selectedType === 'accommodation') return 'hotel';
    if (selectedType === 'activity' && selectedCategory !== 'all') return `category-${selectedCategory}`;
    return 'all';
  });

  readonly activeFilterLabel = computed(() => {
    const activeItem = this.railItems().find((item) => item.key === this.activeRailItem());
    return activeItem?.label || 'Tutto';
  });

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

  selectRailItem(item: SidebarRailItem) {
    this.ui.setType(item.type);
    this.ui.setCategory(item.categoryId);
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

  private toRailItem(category: ActivityCategory): SidebarRailItem {
    return {
      key: `category-${category.id}`,
      label: category.name,
      icon: this.getCategoryIcon(category.name),
      iconValue: category.iconUrl,
      type: 'activity',
      categoryId: category.id
    };
  }

  isBootstrapIcon(value?: string | null): boolean {
    if (!value) return false;
    const normalized = value.trim();
    return normalized.startsWith('bi-') || normalized.startsWith('bi ');
  }

  resolveIconClass(item: SidebarRailItem): string {
    const iconValue = item.iconValue?.trim();
    if (this.isBootstrapIcon(iconValue)) {
      return iconValue!.startsWith('bi ') ? iconValue! : `bi ${iconValue}`;
    }

    return item.icon;
  }

  private getCategoryIcon(name: string): string {
    const normalized = name.toLowerCase();

    if (normalized.includes('landmark') || normalized.includes('monument') || normalized.includes('muse')) {
      return 'bi bi-bank';
    }
    if (normalized.includes('farm') || normalized.includes('pharma') || normalized.includes('salute')) {
      return 'bi bi-hospital';
    }
    if (normalized.includes('risto') || normalized.includes('food') || normalized.includes('cibo')) {
      return 'bi bi-cup-hot';
    }
    if (normalized.includes('night') || normalized.includes('bar') || normalized.includes('club')) {
      return 'bi bi-moon-stars';
    }
    if (normalized.includes('park') || normalized.includes('nature') || normalized.includes('green')) {
      return 'bi bi-tree';
    }
    if (normalized.includes('shop') || normalized.includes('store')) {
      return 'bi bi-bag';
    }
    if (normalized.includes('transport') || normalized.includes('station')) {
      return 'bi bi-signpost-split';
    }

    return 'bi bi-compass';
  }
}
