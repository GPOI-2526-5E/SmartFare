import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UIStateService } from '../../../../core/services/ui-state.service';
import { ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { BuilderPoi } from '../../../../core/models/builder.types';
import { ItineraryService } from '../../../../core/services/itinerary.service';

@Component({
    selector: 'app-builder-sidebar-saved-items',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './builder-sidebar-saved-items.component.html',
    styleUrl: './builder-sidebar-saved-items.component.css'
})
export class BuilderSidebarSavedItemsComponent {
    @Input() savedPois: BuilderPoi[] = [];
    @Output() editPoi = new EventEmitter<BuilderPoi>();
    @Output() deletePoi = new EventEmitter<BuilderPoi>();
    @Output() previewPoi = new EventEmitter<BuilderPoi>();

    itineraryService = inject(ItineraryService);
    ui = inject(UIStateService);
    expandedDay = signal<number | null>(null);

    savedByDay = computed(() => {
        const grouped = new Map<number, BuilderPoi[]>();

        for (const poi of this.savedPois) {
            const day = poi.dayNumber || 1;
            if (!grouped.has(day)) {
                grouped.set(day, []);
            }
            grouped.get(day)!.push(poi);
        }

        return Array.from(grouped.entries())
            .sort(([a], [b]) => a - b)
            .map(([day, items]) => ({ day, items }));
    });

    toggleDay(day: number) {
        this.expandedDay.update(curr => curr === day ? null : day);
    }

    onEditClick(poi: BuilderPoi, event: Event) {
        event.stopPropagation();
        this.editPoi.emit(poi);
    }

    onDeleteClick(poi: BuilderPoi, event: Event) {
        event.stopPropagation();
        if (confirm(`Rimuovere "${poi.title}" dall'itinerario?`)) {
            this.deletePoi.emit(poi);
        }
    }

    onPreviewClick(poi: BuilderPoi) {
        this.previewPoi.emit(poi);
    }

    getTotalSaved(): number {
        return this.savedPois.length;
    }
}
