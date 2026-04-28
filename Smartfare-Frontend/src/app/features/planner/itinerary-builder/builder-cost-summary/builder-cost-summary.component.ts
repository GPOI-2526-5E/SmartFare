import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItineraryExportService, CostBreakdown } from '../../../../core/services/itinerary-export.service';
import { BuilderPoi } from '../builder.types';
import { ItineraryItem } from '../../../../core/models/itinerary.model';
import { AlertService } from '../../../../core/services/alert.service';

@Component({
    selector: 'app-builder-cost-summary',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './builder-cost-summary.component.html',
    styleUrl: './builder-cost-summary.component.css'
})
export class BuilderCostSummaryComponent {
    @Input() savedPois: BuilderPoi[] = [];
    @Input() items: ItineraryItem[] = [];
    @Input() itineraryName: string = 'Il mio itinerario';
    @Input() location: string = 'Destinazione';
    @Input() startDate: string = '';
    @Input() endDate: string = '';

    @Output() export = new EventEmitter<'json' | 'html' | 'pdf'>();

    private exportService = inject(ItineraryExportService);
    private alertService = inject(AlertService);

    showDetails = signal(false);

    poiMap = computed(() => {
        const map = new Map<string, BuilderPoi>();
        for (const poi of this.savedPois) {
            map.set(poi.key, poi);
        }
        return map;
    });

    costs = computed(() => {
        return this.exportService.calculateCosts(this.items, this.poiMap());
    });

    accommodationSummary = computed(() => {
        const costs = this.costs();
        if (costs.accommodations.length === 0) return null;
        return {
            count: costs.accommodations.length,
            total: costs.totalAccommodation,
            avgPerNight: costs.accommodations.length > 0
                ? Math.round(costs.totalAccommodation / costs.accommodations.reduce((sum, a) => sum + a.days, 0) * 100) / 100
                : 0
        };
    });

    activitySummary = computed(() => {
        const costs = this.costs();
        if (costs.activities.length === 0) return null;
        return {
            count: costs.activities.length,
            total: costs.totalActivities,
            avgPerActivity: costs.activities.length > 0
                ? Math.round(costs.totalActivities / costs.activities.length * 100) / 100
                : 0
        };
    });

    getDaysCount(): number {
        if (!this.startDate || !this.endDate) return 0;
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    getCostPerDay(): number {
        const costs = this.costs();
        const days = this.getDaysCount();
        return days > 0 ? Math.round(costs.grandTotal / days * 100) / 100 : 0;
    }

    onExport(format: 'json' | 'html' | 'pdf') {
        this.export.emit(format);
        this.alertService.success(`Esportazione ${format.toUpperCase()} avviata...`);
    }

    toggleDetails() {
        this.showDetails.update(v => !v);
    }
}
