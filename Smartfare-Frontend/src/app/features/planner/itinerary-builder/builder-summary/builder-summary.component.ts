import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Itinerary, ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { BuilderPoi } from '../builder.types';
import { ItineraryService } from '../../../../core/services/itinerary.service';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-builder-summary',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './builder-summary.component.html',
  styleUrl: './builder-summary.component.css'
})
export class BuilderSummaryComponent {
  workspace = input<ItineraryWorkspace | null>(null);
  savedPois = input<BuilderPoi[]>([]);

  private itineraryService = inject(ItineraryService);
  itinerary = this.itineraryService.itinerary;

  accommodations = computed(() => this.savedPois().filter(p => p.type === 'accommodation'));
  activities = computed(() => this.savedPois().filter(p => p.type === 'activity'));

  groupedDays = computed(() => {
    const daysMap = new Map<number, BuilderPoi[]>();

    // Group items by day
    this.savedPois().forEach(poi => {
      const day = poi.dayNumber || 1;
      if (!daysMap.has(day)) {
        daysMap.set(day, []);
      }
      daysMap.get(day)?.push(poi);
    });

    // Sort days and return as array
    return Array.from(daysMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, items]) => ({ day, items }));
  });

  getTotalItems() {
    return this.savedPois().length;
  }

  getDaysCount() {
    const itin = this.itinerary();
    if (!itin || !itin.startDate || !itin.endDate) return 0;

    const start = new Date(itin.startDate);
    const end = new Date(itin.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  drop(event: CdkDragDrop<BuilderPoi[]>, newDay: number) {
    const current = this.itinerary();
    if (!current || !current.items) return;

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

  private updateItineraryOrder(dayMap: Map<number, string[]>) {
    const current = this.itinerary();
    if (!current) return;

    const newItems = [...(current.items || [])];

    // Create a flat map of key -> {day, order}
    const orderMap = new Map<string, { day: number, order: number }>();

    Array.from(dayMap.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([day, keys]) => {
        keys.forEach((key, index) => {
          orderMap.set(key, { day, order: index + 1 });
        });
      });

    // Update the actual itinerary items
    const updatedItems = newItems.map(item => {
      const key = item.accommodationId ? `accommodation-${item.accommodationId}` : `activity-${item.activityId}`;
      const newOrder = orderMap.get(key);
      if (newOrder) {
        return { ...item, dayNumber: newOrder.day, orderInt: newOrder.order };
      }
      return item;
    });

    this.itineraryService.setCurrentItinerary({
      ...current,
      items: updatedItems
    });
  }

  removeItem(poi: BuilderPoi) {
    const current = this.itinerary();
    if (!current || !current.items) return;

    const updatedItems = current.items.filter(item => {
      const key = item.accommodationId ? `accommodation-${item.accommodationId}` : `activity-${item.activityId}`;
      return key !== poi.key;
    });

    this.itineraryService.setCurrentItinerary({
      ...current,
      items: updatedItems
    });
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
}
