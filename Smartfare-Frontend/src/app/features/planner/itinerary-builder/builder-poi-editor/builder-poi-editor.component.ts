import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BuilderPoi } from '../../../../core/models/builder.types';
import { ItineraryItem } from '../../../../core/models/itinerary.model';

@Component({
    selector: 'app-builder-poi-editor',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './builder-poi-editor.component.html',
    styleUrl: './builder-poi-editor.component.css'
})
export class BuilderPoiEditorComponent {
    @Input() poi: BuilderPoi | null = null;
    @Input() item: ItineraryItem | null = null;
    @Input() isOpen = false;

    @Output() close = new EventEmitter<void>();
    @Output() save = new EventEmitter<ItineraryItem>();
    @Output() delete = new EventEmitter<void>();

    formData = signal({
        note: '',
        plannedStartAt: '',
        plannedEndAt: '',
        dayNumber: 1
    });

    private readonly i18n = inject(I18nService);

    ngOnChanges() {
        if (this.item && this.isOpen) {
            this.formData.set({
                note: this.item.note || '',
                plannedStartAt: this.item.plannedStartAt || '',
                plannedEndAt: this.item.plannedEndAt || '',
                dayNumber: this.item.dayNumber
            });
        }
    }

    get poiTitle(): string {
        return this.poi?.title || 'Punto di Interesse';
    }

    get poiType(): string {
        return this.poi?.type === 'accommodation' ? 'Alloggio' : 'Attività';
    }

    onSave() {
        if (!this.item) return;

        const data = this.formData();

        // Validate times
        if (data.plannedStartAt && data.plannedEndAt && data.plannedStartAt > data.plannedEndAt) {
            alert(this.i18n.translate('planner.endBeforeStart'));
            return;
        }

        this.save.emit({
            ...this.item,
            note: data.note,
            plannedStartAt: data.plannedStartAt || null,
            plannedEndAt: data.plannedEndAt || null,
            dayNumber: data.dayNumber
        });

        this.close.emit();
    }

    onDelete() {
        if (confirm(this.i18n.translate('planner.confirmDeleteItem'))) {
            this.delete.emit();
            this.close.emit();
        }
    }

    onClose() {
        this.close.emit();
    }
}
