import { Component, EventEmitter, Output, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Itinerary, ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { BuilderPoi } from '../builder.types';
import { ItineraryService } from '../../../../core/services/itinerary.service';
import { UIStateService } from '../../../../core/services/ui-state.service';

interface SummaryStat {
  label: string;
  value: string;
  detail: string;
  icon: string;
}

interface CategoryCluster {
  id: number;
  name: string;
  count: number;
  color: string;
}

interface HighlightCard {
  eyebrow: string;
  title: string;
  detail: string;
  imageUrl: string | null;
  color: string;
}

interface DaySection {
  day: number;
  color: string;
  label: string;
  date: Date | null;
  items: BuilderPoi[];
  hotels: BuilderPoi[];
  activities: BuilderPoi[];
  scheduledCount: number;
  coverage: number;
  vibe: string;
}

@Component({
  selector: 'app-builder-summary',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './builder-summary.component.html',
  styleUrls: ['./builder-summary.component.css']
})
export class BuilderSummaryComponent {
  workspace = input<ItineraryWorkspace | null>(null);
  savedPois = input<BuilderPoi[]>([]);

  @Output() showOnMap = new EventEmitter<BuilderPoi>();

  private itineraryService = inject(ItineraryService);
  private ui = inject(UIStateService);

  itinerary = this.itineraryService.itinerary;

  readonly selectedHotels = computed(() => this.savedPois().filter((poi) => poi.type === 'accommodation'));
  readonly selectedActivities = computed(() => this.savedPois().filter((poi) => poi.type === 'activity'));
  readonly occupiedDaysCount = computed(() => this.daySections().filter((day) => day.items.length > 0).length);
  readonly freeDaysCount = computed(() => Math.max(0, this.daySections().length - this.occupiedDaysCount()));
  readonly planningProgress = computed(() => {
    const totalDays = this.daySections().length;
    if (!totalDays) return 0;
    return Math.round((this.occupiedDaysCount() / totalDays) * 100);
  });

  readonly categoryClusters = computed<CategoryCluster[]>(() => {
    const counts = new Map<number, CategoryCluster>();

    for (const poi of this.selectedActivities()) {
      const id = poi.categoryId ?? -1;
      const name = poi.categoryName || 'Esperienze varie';

      if (!counts.has(id)) {
        counts.set(id, {
          id,
          name,
          count: 0,
          color: this.getCategoryColor(name)
        });
      }

      counts.get(id)!.count += 1;
    }

    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  });

  readonly summaryStats = computed<SummaryStat[]>(() => {
    const totalItems = this.savedPois().length;
    const hotelCount = this.selectedHotels().length;
    const activityCount = this.selectedActivities().length;
    const busiest = this.getBusiestDay();

    return [
      {
        label: 'Tappe',
        value: String(totalItems),
        detail: `${hotelCount} hotel e ${activityCount} attivita selezionate`,
        icon: 'bi-signpost-split-fill'
      },
      {
        label: 'Copertura',
        value: `${this.planningProgress()}%`,
        detail: `${this.occupiedDaysCount()} giorni su ${this.daySections().length || 0} hanno gia contenuto`,
        icon: 'bi-calendar2-check-fill'
      },
      {
        label: 'Giorno top',
        value: busiest ? `G${busiest.day}` : '--',
        detail: busiest ? `${busiest.items.length} elementi nella giornata piu intensa` : 'Nessuna giornata ancora pianificata',
        icon: 'bi-lightning-charge-fill'
      },
      {
        label: 'Mood',
        value: this.categoryClusters()[0]?.name || 'Da definire',
        detail: this.categoryClusters().length
          ? `${this.categoryClusters().length} temi attivi nel viaggio`
          : 'Aggiungi attivita per creare uno stile di viaggio',
        icon: 'bi-palette-fill'
      }
    ];
  });

  readonly heroCards = computed<HighlightCard[]>(() => {
    const featuredHotel = this.getFeaturedHotel();
    const featuredActivity = this.selectedActivities()[0] || null;
    const busiest = this.getBusiestDay();

    return [
      {
        eyebrow: 'Stay',
        title: featuredHotel?.title || 'Scegli il primo hotel',
        detail: featuredHotel
          ? `${this.formatRating(featuredHotel)}${featuredHotel.price ? ' · da ' + this.formatCurrency(featuredHotel.price) + ' / notte' : ''}`
          : 'Quando aggiungi un hotel comparira qui con immagine, stelle e prezzo.',
        imageUrl: featuredHotel?.imageUrl || null,
        color: '#2563eb'
      },
      {
        eyebrow: 'Experience',
        title: featuredActivity?.title || 'Aggiungi la prima attivita',
        detail: featuredActivity
          ? `${featuredActivity.categoryName || 'Esperienza'}${featuredActivity.price ? ' · ' + this.formatCurrency(featuredActivity.price) : ''}`
          : 'Le attivita portano ritmo, categorie e colori nel summary.',
        imageUrl: featuredActivity?.imageUrl || null,
        color: '#ea580c'
      },
      {
        eyebrow: 'Flow',
        title: busiest ? `Giorno ${busiest.day} sotto i riflettori` : 'Timeline pronta da costruire',
        detail: busiest
          ? `${busiest.hotels.length} hotel, ${busiest.activities.length} attivita, ${busiest.scheduledCount} slot con orario.`
          : 'Distribuisci gli elementi sui giorni per creare un racconto piu ordinato.',
        imageUrl: this.getDayCoverImage(busiest) || null,
        color: '#059669'
      }
    ];
  });

  readonly daySections = computed<DaySection[]>(() => {
    const totalDays = Math.max(1, this.getDaysCount());
    const grouped = new Map<number, BuilderPoi[]>();

    for (let day = 1; day <= totalDays; day++) {
      grouped.set(day, []);
    }

    for (const poi of this.savedPois()) {
      const safeDay = Math.min(Math.max(poi.dayNumber || 1, 1), totalDays);
      grouped.get(safeDay)?.push(poi);
    }

    const maxItems = Math.max(1, ...Array.from(grouped.values()).map((items) => items.length));

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, items]) => {
        const sortedItems = items.slice().sort((a, b) => {
          const startA = a.plannedStartAt || '';
          const startB = b.plannedStartAt || '';

          if (startA !== startB) {
            return startA.localeCompare(startB);
          }

          return a.title.localeCompare(b.title);
        });

        const hotels = sortedItems.filter((item) => item.type === 'accommodation');
        const activities = sortedItems.filter((item) => item.type === 'activity');

        return {
          day,
          color: this.ui.getDefaultDayColor(day),
          label: this.getDayLabel(day, hotels.length, activities.length),
          date: this.getDayDate(day),
          items: sortedItems,
          hotels,
          activities,
          scheduledCount: sortedItems.filter((item) => !!item.plannedStartAt || !!item.plannedEndAt).length,
          coverage: Math.round((sortedItems.length / maxItems) * 100),
          vibe: this.getDayVibe(hotels.length, activities.length, sortedItems.length)
        };
      });
  });

  getSummaryDescription(): string {
    const destination = this.workspace()?.location?.name || 'la tua destinazione';
    const hotels = this.selectedHotels().length;
    const activities = this.selectedActivities().length;

    if (!this.savedPois().length) {
      return `Partiamo da ${destination}: il nuovo summary mette in evidenza immagini, ritmi giornalieri e categorie reali di hotel e attivita.`;
    }

    if (!activities) {
      return `Hai gia impostato ${hotels} hotel. Aggiungi attivita per dare colore, ritmo e identita a ogni giornata del viaggio.`;
    }

    if (!hotels) {
      return `Le attivita sono gia presenti, ma manca ancora il lato soggiorno. Inserire almeno un hotel rendera il viaggio molto piu leggibile.`;
    }

    return `${destination} prende forma con ${hotels} hotel e ${activities} attivita: ora puoi rifinire orari, note e distribuzione giorno per giorno.`;
  }

  getTotalItems(): number {
    return this.savedPois().length;
  }

  getDaysCount(): number {
    const itinerary = this.itinerary();
    if (!itinerary?.startDate || !itinerary?.endDate) return 0;

    const start = new Date(itinerary.startDate);
    const end = new Date(itinerary.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  getDayDate(day: number): Date | null {
    const itinerary = this.itinerary();
    if (!itinerary?.startDate) return null;

    const date = new Date(itinerary.startDate);
    if (Number.isNaN(date.getTime())) return null;

    date.setDate(date.getDate() + Math.max(0, day - 1));
    return date;
  }

  formatPoiSchedule(poi: BuilderPoi): string | null {
    const start = this.formatTime(poi.plannedStartAt);
    const end = this.formatTime(poi.plannedEndAt);

    if (start && end) return `${start} - ${end}`;
    if (start) return `Dalle ${start}`;
    if (end) return `Fino alle ${end}`;

    return null;
  }

  getPoiMetaLabel(poi: BuilderPoi): string {
    if (poi.type === 'accommodation') {
      return poi.subtitle || 'Pernottamento';
    }

    return poi.categoryName || poi.subtitle || 'Esperienza';
  }

  getPoiBadgeColor(poi: BuilderPoi): string {
    return poi.type === 'accommodation'
      ? '#2563eb'
      : this.getCategoryColor(poi.categoryName || poi.title);
  }

  getPoiCover(poi: BuilderPoi): string | null {
    return poi.imageUrl || null;
  }

  getPoiPriceLabel(poi: BuilderPoi): string | null {
    if (typeof poi.price !== 'number' || Number.isNaN(poi.price)) return null;
    return this.formatCurrency(poi.price) + (poi.type === 'accommodation' ? ' / notte' : '');
  }

  getPoiRatingLabel(poi: BuilderPoi): string | null {
    if (typeof poi.rating !== 'number' || Number.isNaN(poi.rating)) return null;
    return this.formatRating(poi);
  }

  getDayCoverImage(section: DaySection | null | undefined): string | null {
    if (!section) return null;
    return section.hotels[0]?.imageUrl || section.activities[0]?.imageUrl || null;
  }

  drop(event: CdkDragDrop<BuilderPoi[]>, newDay: number): void {
    const current = this.itinerary();
    if (!current?.items) return;

    const movedPoi = event.item.data as BuilderPoi | undefined;
    if (!movedPoi) return;

    const dayMap = this.buildDayMap(current.items);
    const sourceDay = movedPoi.dayNumber ?? this.findDayByKey(dayMap, movedPoi.key) ?? newDay;
    const sourceList = [...(dayMap.get(sourceDay) || [])];
    const targetList = event.previousContainer === event.container ? sourceList : [...(dayMap.get(newDay) || [])];

    if (event.previousContainer === event.container) {
      moveItemInArray(sourceList, event.previousIndex, event.currentIndex);
      dayMap.set(sourceDay, sourceList);
    } else {
      transferArrayItem(sourceList, targetList, event.previousIndex, event.currentIndex);
      dayMap.set(sourceDay, sourceList);
      dayMap.set(newDay, targetList);
    }

    this.updateItineraryOrder(dayMap);
  }

  removeItem(poi: BuilderPoi): void {
    const current = this.itinerary();
    if (!current?.items) return;

    const updatedItems = current.items.filter((item) => {
      const key = item.accommodationId ? `accommodation-${item.accommodationId}` : `activity-${item.activityId}`;
      return key !== poi.key;
    });

    this.itineraryService.setCurrentItinerary({
      ...this.withNormalizedEndDate(current, updatedItems),
      items: updatedItems
    });
  }

  updateField(poi: BuilderPoi, field: 'note' | 'plannedStartAt' | 'plannedEndAt', value: string | null): void {
    const current = this.itinerary();
    if (!current?.items) return;

    const updatedItems = current.items.map((item) => {
      const key = item.accommodationId ? `accommodation-${item.accommodationId}` : `activity-${item.activityId}`;
      if (key === poi.key) {
        return { ...item, [field]: value };
      }
      return item;
    });

    this.itineraryService.setCurrentItinerary({
      ...current,
      items: updatedItems
    });
  }

  formatDateForInput(dateStr: string | null | undefined): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  onDateFieldChange(poi: BuilderPoi, field: 'plannedStartAt' | 'plannedEndAt', value: string): void {
    if (!value) {
      this.updateField(poi, field, null);
      return;
    }

    const date = new Date(value);
    this.updateField(poi, field, date.toISOString());
  }

  viewOnMap(poi: BuilderPoi): void {
    this.showOnMap.emit(poi);
  }

  addDay(): void {
    const current = this.itinerary();
    if (!current?.endDate) return;

    const endDate = new Date(current.endDate);
    endDate.setDate(endDate.getDate() + 1);
    const newDay = this.getDaysCount() + 1;

    this.itineraryService.setCurrentItinerary({
      ...current,
      endDate: endDate.toISOString().split('T')[0]
    });

    this.ui.ensureDayColor(newDay);
    this.ui.setSelectedDay(newDay);
    this.ui.setVisibleDayRoute(newDay);
  }

  trackByPoiKey(_: number, poi: BuilderPoi): string {
    return poi.key;
  }

  private getFeaturedHotel(): BuilderPoi | null {
    const hotels = this.selectedHotels();
    if (!hotels.length) return null;

    return hotels
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (a.price || 0) - (b.price || 0))[0];
  }

  private getBusiestDay(): DaySection | null {
    const sections = this.daySections();
    if (!sections.length) return null;

    return sections.reduce<DaySection | null>((best, current) => {
      if (!best || current.items.length > best.items.length) {
        return current;
      }
      return best;
    }, null);
  }

  private getDayLabel(day: number, hotels: number, activities: number): string {
    if (!hotels && !activities) return `Giorno ${day} ancora aperto`;
    if (hotels && !activities) return `Giorno ${day} dedicato al soggiorno`;
    if (!hotels && activities) return `Giorno ${day} focalizzato sulle esperienze`;
    return `Giorno ${day} equilibrato tra stay ed esperienze`;
  }

  private getDayVibe(hotels: number, activities: number, total: number): string {
    if (!total) return 'Vuoto';
    if (hotels > 0 && activities === 0) return 'Relax';
    if (activities >= 4) return 'Intenso';
    if (activities >= 2) return 'Dinamico';
    if (hotels > 0 && activities > 0) return 'Bilanciato';
    return 'Leggero';
  }

  private updateItineraryOrder(dayMap: Map<number, string[]>): void {
    const current = this.itinerary();
    if (!current) return;

    const orderMap = new Map<string, { day: number; order: number }>();

    Array.from(dayMap.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([day, keys]) => {
        keys.forEach((key, index) => {
          orderMap.set(key, { day, order: index + 1 });
        });
      });

    const updatedItems = [...(current.items || [])].map((item) => {
      const key = item.accommodationId ? `accommodation-${item.accommodationId}` : `activity-${item.activityId}`;
      const position = orderMap.get(key);

      if (position) {
        return { ...item, dayNumber: position.day, orderInt: position.order };
      }

      return item;
    });

    this.itineraryService.setCurrentItinerary({
      ...this.withNormalizedEndDate(current, updatedItems),
      items: updatedItems
    });
  }

  private withNormalizedEndDate(current: Itinerary, items: Itinerary['items'] = []): Itinerary {
    if (!current.startDate) {
      return current;
    }

    const startDate = new Date(current.startDate);
    if (Number.isNaN(startDate.getTime())) {
      return current;
    }

    const highestUsedDay = (items || []).reduce((maxDay, item) => {
      const safeDay = Number.isFinite(item.dayNumber) && item.dayNumber > 0 ? item.dayNumber : 1;
      return Math.max(maxDay, safeDay);
    }, 1);

    const normalizedEndDate = new Date(startDate);
    normalizedEndDate.setDate(normalizedEndDate.getDate() + Math.max(0, highestUsedDay - 1));

    return {
      ...current,
      endDate: normalizedEndDate.toISOString().split('T')[0]
    };
  }

  private buildDayMap(items: Itinerary['items'] = []): Map<number, string[]> {
    const sorted = [...items].sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
      return a.orderInt - b.orderInt;
    });

    const map = new Map<number, string[]>();

    sorted.forEach((item) => {
      const day = item.dayNumber || 1;
      const key = item.accommodationId
        ? `accommodation-${item.accommodationId}`
        : `activity-${item.activityId}`;

      if (!map.has(day)) {
        map.set(day, []);
      }

      map.get(day)!.push(key);
    });

    return map;
  }

  private findDayByKey(dayMap: Map<number, string[]>, key: string): number | null {
    for (const [day, keys] of dayMap.entries()) {
      if (keys.includes(key)) {
        return day;
      }
    }

    return null;
  }

  private getCategoryColor(seed: string): string {
    const palette = ['#0f766e', '#2563eb', '#7c3aed', '#ea580c', '#be123c', '#0284c7', '#16a34a'];
    const hash = seed
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return palette[Math.abs(hash) % palette.length];
  }

  private formatTime(value?: string | null): string | null {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  }

  private formatRating(poi: BuilderPoi): string {
    if (typeof poi.rating !== 'number' || Number.isNaN(poi.rating)) {
      return poi.type === 'accommodation' ? 'Hotel selezionato' : 'Esperienza selezionata';
    }

    return poi.type === 'accommodation'
      ? `${poi.rating} stelle`
      : `${poi.rating.toFixed(1)} / 5`;
  }
}
