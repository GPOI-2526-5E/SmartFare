import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, input, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Itinerary, ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { BuilderPoi } from '../builder.types';
import { ItineraryService } from '../../../../core/services/itinerary.service';
import { UIStateService } from '../../../../core/services/ui-state.service';
import { AlertService } from '../../../../core/services/alert.service';

interface DaySection {
  day: number;
  label: string;
  date: Date | null;
  items: BuilderPoi[];
}

interface ExploreCard {
  title: string;
  subtitle: string;
  provider: string;
  imageUrl: string;
}

@Component({
  selector: 'app-builder-summary',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './builder-summary.component.html',
  styleUrls: ['./builder-summary.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BuilderSummaryComponent {
  workspace = input<ItineraryWorkspace | null>(null);
  savedPois = input<BuilderPoi[]>([]);

  @Output() showOnMap = new EventEmitter<BuilderPoi>();

  private itineraryService = inject(ItineraryService);
  private ui = inject(UIStateService);
  private alertService = inject(AlertService);

  itinerary = this.itineraryService.itinerary;

  // Stato per l'editing del titolo dell'itinerario
  isEditingTitle = signal<boolean>(false);
  editTitleValue = signal<string>('');

  // Stato per il popup dell'orario
  activeTimePopupPoiKey = signal<string | null>(null);
  popupStartTime = signal<string>('');
  popupEndTime = signal<string>('');
  
  // Opzioni orari (es. 08:00, 08:30...)
  timeOptions = computed(() => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 60; j += 30) {
        const h = i.toString().padStart(2, '0');
        const m = j.toString().padStart(2, '0');
        options.push(`${h}:${m}`);
      }
    }
    return options;
  });

  // Dati mockup esplora
  exploreCards: ExploreCard[] = [
    {
      title: 'Migliori attrazioni a Torino',
      subtitle: 'I più visti sul web',
      provider: 'Wanderlog',
      imageUrl: '/assets/home-section.avif' // Placeholder
    },
    {
      title: 'Migliori ristoranti a Torino',
      subtitle: 'I più visti sul web',
      provider: 'Wanderlog',
      imageUrl: '/assets/home-section.avif'
    },
    {
      title: 'Cerca hotel con tariffe trasparenti',
      subtitle: 'Diversamente da altri siti, non classifichiamo in base alle commissioni',
      provider: 'Wanderlog',
      imageUrl: '/assets/home-section.avif'
    }
  ];

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

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, items]) => {
        const sortedItems = items.slice().sort((a, b) => {
          const startA = a.plannedStartAt || '';
          const startB = b.plannedStartAt || '';

          if (startA !== startB) {
            return startA.localeCompare(startB);
          }

          return 0;
        });

        return {
          day,
          label: `Giorno ${day}`,
          date: this.getDayDate(day),
          items: sortedItems
        };
      });
  });

  getDaysCount(): number {
    const itinerary = this.itinerary();
    if (!itinerary?.startDate || !itinerary?.endDate) return 1;

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

  // --- Title Edit ---
  startEditingTitle(): void {
    const currentName = this.itinerary()?.name || this.workspace()?.location?.name || 'Viaggio';
    this.editTitleValue.set(currentName);
    this.isEditingTitle.set(true);
  }

  saveTitle(): void {
    const newName = this.editTitleValue().trim();
    if (newName) {
      const current = this.itinerary();
      if (current) {
        this.itineraryService.setCurrentItinerary({
          ...current,
          name: newName
        });
      }
    }
    this.isEditingTitle.set(false);
  }

  cancelTitleEdit(): void {
    this.isEditingTitle.set(false);
  }

  // --- Notes Edit ---
  updateNote(poi: BuilderPoi, note: string): void {
    this.updateField(poi, 'note', note);
  }

  // --- Time Popup ---
  openTimePopup(poi: BuilderPoi, event: Event): void {
    event.stopPropagation();
    
    // Parse existing time
    let start = '';
    let end = '';
    if (poi.plannedStartAt) {
      const d = new Date(poi.plannedStartAt);
      if (!Number.isNaN(d.getTime())) {
        start = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      }
    }
    if (poi.plannedEndAt) {
      const d = new Date(poi.plannedEndAt);
      if (!Number.isNaN(d.getTime())) {
        end = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      }
    }

    this.popupStartTime.set(start);
    this.popupEndTime.set(end);
    this.activeTimePopupPoiKey.set(poi.key);
  }

  closeTimePopup(): void {
    this.activeTimePopupPoiKey.set(null);
  }

  @HostListener('document:click')
  onDocumentClick() {
    // Chiudi il popup se si clicca fuori
    if (this.activeTimePopupPoiKey()) {
      this.closeTimePopup();
    }
  }

  // Previene la chiusura cliccando all'interno del popup
  onPopupClick(event: Event) {
    event.stopPropagation();
  }

  saveTime(poi: BuilderPoi): void {
    const startStr = this.popupStartTime();
    const endStr = this.popupEndTime();
    
    let startIso = null;
    let endIso = null;
    
    const dayDate = this.getDayDate(poi.dayNumber || 1) || new Date();
    
    if (startStr && dayDate) {
      const [h, m] = startStr.split(':').map(Number);
      const d = new Date(dayDate);
      d.setHours(h, m, 0, 0);
      startIso = d.toISOString();
    }
    
    if (endStr && dayDate) {
      const [h, m] = endStr.split(':').map(Number);
      const d = new Date(dayDate);
      d.setHours(h, m, 0, 0);
      endIso = d.toISOString();
    }

    const current = this.itinerary();
    if (!current?.items) {
      this.closeTimePopup();
      return;
    }

    const updatedItems = current.items.map((item) => {
      const key = item.accommodationId ? `accommodation-${item.accommodationId}` : `activity-${item.activityId}`;
      if (key === poi.key) {
        return { ...item, plannedStartAt: startIso, plannedEndAt: endIso };
      }
      return item;
    });

    this.itineraryService.setCurrentItinerary({
      ...current,
      items: updatedItems
    });
    
    this.closeTimePopup();
  }

  clearTime(poi: BuilderPoi): void {
     const current = this.itinerary();
    if (!current?.items) return;

    const updatedItems = current.items.map((item) => {
      const key = item.accommodationId ? `accommodation-${item.accommodationId}` : `activity-${item.activityId}`;
      if (key === poi.key) {
        return { ...item, plannedStartAt: null, plannedEndAt: null };
      }
      return item;
    });

    this.itineraryService.setCurrentItinerary({
      ...current,
      items: updatedItems
    });
    this.closeTimePopup();
  }

  // --- Utils ---
  private updateField(poi: BuilderPoi, field: string, value: any): void {
    const current = this.itinerary();
    if (!current?.items) return;
    
    if ((poi as any)[field] === value) return;

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

  formatTimeDisplay(poi: BuilderPoi): string {
    const start = this.formatTimeString(poi.plannedStartAt);
    const end = this.formatTimeString(poi.plannedEndAt);
    
    if (start && end) return `${start} - ${end}`;
    if (start) return start;
    if (end) return end;
    return 'Orari';
  }

  private formatTimeString(isoString?: string | null): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  getPoiCover(poi: BuilderPoi): string | null {
    return poi.imageUrl || null;
  }
  
  getPoiPrice(poi: BuilderPoi): string | null {
    if (typeof poi.price !== 'number' || Number.isNaN(poi.price)) return null;
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(poi.price);
  }

  removeItem(poi: BuilderPoi): void {
    const current = this.itinerary();
    if (!current?.items) return;

    const updatedItems = current.items.filter((item) => {
      const key = item.accommodationId ? `accommodation-${item.accommodationId}` : `activity-${item.activityId}`;
      return key !== poi.key;
    });

    this.itineraryService.setCurrentItinerary({
      ...current,
      items: updatedItems
    });
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
      ...current,
      items: updatedItems
    });
  }
}
