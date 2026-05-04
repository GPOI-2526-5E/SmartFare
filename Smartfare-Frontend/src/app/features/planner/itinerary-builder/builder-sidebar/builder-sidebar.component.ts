import { Component, EventEmitter, Input, OnDestroy, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIStateService } from '../../../../core/services/ui-state.service';
import { ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { BuilderPoi } from '../../../../core/models/builder.types';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface PoiSection {
  key: string;
  label: string;
  icon: string;
  items: BuilderPoi[];
  collapsed: boolean;
}

@Component({
  selector: 'app-builder-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './builder-sidebar.component.html',
  styleUrl: './builder-sidebar.component.css'
})
export class BuilderSidebarComponent implements OnDestroy {
  private workspaceSignal = signal<ItineraryWorkspace | null>(null);
  private savedPoiKeysSignal = signal<Set<string>>(new Set<string>());

  // Debounced search: raw input value (bound directly via DOM event)
  // to avoid ngModel overhead, + debounce via Subject
  searchInputValue = '';
  private searchSubject = new Subject<string>();
  readonly searchTerm = signal('');

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

  readonly ui = inject(UIStateService);
  readonly collapsedSections = signal<Set<string>>(new Set());

  constructor() {
    this.searchSubject.pipe(
      takeUntilDestroyed(),
      debounceTime(250)
    ).subscribe(term => {
      this.searchTerm.set(term);
      this.currentPage.set(1);
    });
  }

  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      // Scroll to top of sidebar content
      const scrollEl = document.querySelector('.sb-scroll');
      if (scrollEl) scrollEl.scrollTop = 0;
    }
  }

  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchInputValue = val;
    this.searchSubject.next(val);
  }

  clearSearch() {
    this.searchInputValue = '';
    this.searchTerm.set('');
    this.currentPage.set(1);
  }

  // ── All POIs flat list ───────────────────────────────────────────────────
  readonly allPois = computed((): BuilderPoi[] => {
    const ws = this.workspaceSignal();
    if (!ws) return [];

    const accommodations: BuilderPoi[] = ws.accommodations.map(acc => ({
      key: `accommodation-${acc.id}`,
      type: 'accommodation' as const,
      entityId: acc.id,
      title: acc.name,
      subtitle: acc.street || 'Alloggio',
      latitude: acc.latitude,
      longitude: acc.longitude,
      itemTypeCode: 'ACCOMMODATION' as const,
      imageUrl: acc.imageUrl,
      price: acc.pricePerNight,
      rating: acc.stars
    }));

    const activities: BuilderPoi[] = ws.activities.map(a => ({
      key: `activity-${a.id}`,
      type: 'activity' as const,
      entityId: a.id,
      title: a.name,
      subtitle: a.category?.name || a.street || 'Attività',
      latitude: a.latitude,
      longitude: a.longitude,
      categoryId: a.categoryId,
      categoryName: a.category?.name,
      itemTypeCode: 'ACTIVITY' as const,
      imageUrl: a.imageUrl,
      price: a.price,
      rating: a.rating
    }));

    return [...accommodations, ...activities];
  });

  // ── Filtered by active category + search term ────────────────────────────
  readonly filteredPois = computed(() => {
    const selectedType = this.ui.selectedType();
    const selectedCategory = this.ui.selectedCategory();
    const term = this.searchTerm().toLowerCase().trim();

    return this.allPois().filter(poi => {
      if (selectedType !== 'all' && poi.type !== selectedType) return false;
      if (selectedCategory !== 'all' && poi.type === 'activity' && poi.categoryId !== selectedCategory) return false;
      if (term) {
        return poi.title.toLowerCase().includes(term) ||
          (poi.subtitle?.toLowerCase().includes(term) ?? false);
      }
      return true;
    });
  });

  readonly totalCount = computed(() => this.filteredPois().length);

  // ── Grouped into collapsable sections ───────────────────────────────────
  readonly sections = computed((): PoiSection[] => {
    const allFiltered = this.filteredPois();
    const page = this.currentPage();
    const size = this.pageSize();

    // Pagination slicing
    const startIndex = (page - 1) * size;
    const pois = allFiltered.slice(startIndex, startIndex + size);

    const collapsed = this.collapsedSections();
    const result: PoiSection[] = [];

    const hotels = pois.filter(p => p.type === 'accommodation');
    if (hotels.length > 0) {
      result.push({ key: 'hotel', label: 'Hotel & Alloggi', icon: 'bi-building', items: hotels, collapsed: collapsed.has('hotel') });
    }

    const activities = pois.filter(p => p.type === 'activity');
    const catMap = new Map<number, { name: string; items: BuilderPoi[] }>();
    for (const poi of activities) {
      const id = poi.categoryId ?? 0;
      if (!catMap.has(id)) catMap.set(id, { name: poi.categoryName || 'Attività', items: [] });
      catMap.get(id)!.items.push(poi);
    }

    Array.from(catMap.entries())
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .forEach(([id, cat]) => {
        const key = `cat-${id}`;
        result.push({ key, label: cat.name, icon: this.getCategoryIcon(cat.name), items: cat.items, collapsed: collapsed.has(key) });
      });

    return result;
  });

  toggleSection(key: string) {
    this.collapsedSections.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  onPreview(poi: BuilderPoi) {
    this.previewPoi.emit(poi);
    this.focusSidebar.emit();
  }

  onAdd(poi: BuilderPoi, event: Event) {
    event.stopPropagation();
    this.addPoi.emit(poi);
    this.focusSidebar.emit();
  }

  isSaved(poi: BuilderPoi): boolean {
    return this.savedPoiKeysSignal().has(poi.key);
  }

  private getCategoryIcon(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('muse') || n.includes('monument') || n.includes('landmark') || n.includes('storico')) return 'bi-bank';
    if (n.includes('food') || n.includes('risto') || n.includes('cucina') || n.includes('cibo')) return 'bi-cup-hot';
    if (n.includes('night') || n.includes('club') || n.includes('vita notturna')) return 'bi-moon-stars';
    if (n.includes('park') || n.includes('nature') || n.includes('parco') || n.includes('verde')) return 'bi-tree';
    if (n.includes('shop') || n.includes('store') || n.includes('negozi') || n.includes('mercato')) return 'bi-bag';
    if (n.includes('sport') || n.includes('fitness') || n.includes('swim') || n.includes('palestra')) return 'bi-trophy';
    if (n.includes('spa') || n.includes('wellness') || n.includes('benessere') || n.includes('relax')) return 'bi-flower2';
    if (n.includes('tour') || n.includes('escurs') || n.includes('avventura')) return 'bi-map';
    if (n.includes('arte') || n.includes('art') || n.includes('galler') || n.includes('cultura')) return 'bi-palette';
    if (n.includes('beach') || n.includes('spiaggia') || n.includes('mare')) return 'bi-water';
    if (n.includes('religion') || n.includes('chiesa') || n.includes('tempio')) return 'bi-building-check';
    return 'bi-compass';
  }

  ngOnDestroy() { }
}
