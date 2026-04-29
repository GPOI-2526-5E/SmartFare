import { Injectable } from '@angular/core';
import { Itinerary, ItineraryItem } from '../models/itinerary.model';
import { BuilderPoi } from '../../features/planner/itinerary-builder/builder.types';

export interface CostBreakdown {
    accommodations: { title: string; price: number; days: number; subtotal: number }[];
    activities: { title: string; price: number; quantity: number }[];
    totalAccommodation: number;
    totalActivities: number;
    grandTotal: number;
}

export interface ItineraryExport {
    title: string;
    dates: { start: string; end: string };
    location: string;
    days: DayExport[];
    costs: CostBreakdown;
    generatedAt: string;
}

export interface DayExport {
    day: number;
    items: DayExportItem[];
}

export interface DayExportItem {
    type: 'accommodation' | 'activity';
    title: string;
    subtitle?: string;
    imageUrl?: string;
    notes?: string;
    checkIn?: string;
    checkOut?: string;
    startAt?: string;
    endAt?: string;
    duration?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ItineraryExportService {

    /**
     * Calculates cost breakdown for the itinerary
     */
    calculateCosts(items: ItineraryItem[], pois: Map<string, BuilderPoi>): CostBreakdown {
        const accommodations: any[] = [];
        const activities: any[] = [];
        let totalAccommodation = 0;
        let totalActivities = 0;

        // Group items by type
        const groupedItems = new Map<string, ItineraryItem[]>();
        for (const item of items) {
            const key = item.accommodationId ? `acc-${item.accommodationId}` : `act-${item.activityId}`;
            if (!groupedItems.has(key)) {
                groupedItems.set(key, []);
            }
            groupedItems.get(key)!.push(item);
        }

        // Calculate accommodation costs
        for (const [key, itemGroup] of groupedItems) {
            if (key.startsWith('acc-')) {
                const poiKey = `accommodation-${key.substring(4)}`;
                const poi = pois.get(poiKey);
                if (poi && poi.price) {
                    const days = new Set(itemGroup.map(i => i.dayNumber)).size;
                    const subtotal = poi.price * days;
                    accommodations.push({
                        title: poi.title,
                        price: poi.price,
                        days,
                        subtotal
                    });
                    totalAccommodation += subtotal;
                }
            } else if (key.startsWith('act-')) {
                const poiKey = `activity-${key.substring(4)}`;
                const poi = pois.get(poiKey);
                if (poi && poi.price) {
                    const quantity = itemGroup.length;
                    activities.push({
                        title: poi.title,
                        price: poi.price,
                        quantity
                    });
                    totalActivities += poi.price * quantity;
                }
            }
        }

        return {
            accommodations,
            activities,
            totalAccommodation,
            totalActivities,
            grandTotal: totalAccommodation + totalActivities
        };
    }

    /**
     * Generates a detailed export of the itinerary
     */
    generateExport(
        itinerary: Itinerary,
        items: ItineraryItem[],
        pois: Map<string, BuilderPoi>,
        location?: { name: string }
    ): ItineraryExport {
        const costs = this.calculateCosts(items, pois);
        const sortedItems = [...items].sort((a, b) => {
            if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
            return a.orderInt - b.orderInt;
        });
        const itemsByDay = this.groupByDay(sortedItems);
        const days: DayExport[] = [];

        for (const [dayNum, dayItems] of itemsByDay) {
            const dayExport: DayExport = {
                day: dayNum,
                items: []
            };

            for (const item of dayItems) {
                const poi = this.getPoiForItem(item, pois);
                if (!poi) continue;

                const isHotel = poi.type === 'accommodation';
                const itemExport: DayExportItem = {
                    type: poi.type,
                    title: poi.title,
                    subtitle: poi.subtitle,
                    imageUrl: poi.imageUrl,
                    notes: item.note?.trim() || undefined,
                    checkIn: isHotel ? this.formatClock(item.plannedStartAt) : undefined,
                    checkOut: isHotel ? this.formatClock(item.plannedEndAt) : undefined,
                    startAt: !isHotel ? this.formatClock(item.plannedStartAt) : undefined,
                    endAt: !isHotel ? this.formatClock(item.plannedEndAt) : undefined,
                    duration: this.calculateDuration(item.plannedStartAt, item.plannedEndAt)
                };

                dayExport.items.push(itemExport);
            }

            days.push(dayExport);
        }

        return {
            title: itinerary.name || 'Il mio itinerario',
            dates: {
                start: itinerary.startDate || '',
                end: itinerary.endDate || ''
            },
            location: location?.name || 'Destinazione',
            days,
            costs,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Exports to JSON
     */
    exportToJSON(data: ItineraryExport): string {
        return JSON.stringify(data, null, 2);
    }

    /**
     * Exports to HTML (printable)
     */
    exportToHTML(data: ItineraryExport): string {
        const html = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(data.title)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            color: #0f172a;
            line-height: 1.5;
            padding: 28px;
            background:
                radial-gradient(circle at top left, rgba(14, 165, 233, 0.18), transparent 35%),
                radial-gradient(circle at top right, rgba(16, 185, 129, 0.16), transparent 32%),
                linear-gradient(180deg, #eef6fb 0%, #f8fafc 100%);
        }
        .export-sheet {
            max-width: 1040px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.88);
            border: 1px solid rgba(148, 163, 184, 0.28);
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
            backdrop-filter: blur(16px);
        }
        .hero {
            padding: 32px 34px 24px;
            background: linear-gradient(135deg, #0f766e 0%, #0369a1 100%);
            color: #fff;
        }
        .eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.16);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        h1 {
            font-size: 36px;
            line-height: 1.05;
            margin: 16px 0 10px;
        }
        .hero-subtitle {
            max-width: 760px;
            font-size: 15px;
            opacity: 0.92;
        }
        .meta-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 18px;
        }
        .meta-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.16);
            font-size: 13px;
            font-weight: 600;
        }
        .content {
            padding: 28px 30px 34px;
        }
        .day {
            margin-bottom: 24px;
            page-break-inside: avoid;
        }
        .day-header {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 14px;
        }
        .day-header h2 {
            font-size: 20px;
            color: #0f172a;
        }
        .day-count {
            color: #0f766e;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .item {
            display: grid;
            grid-template-columns: 180px minmax(0, 1fr);
            gap: 18px;
            margin-bottom: 14px;
            padding: 14px;
            border-radius: 20px;
            background: #fff;
            border: 1px solid rgba(148, 163, 184, 0.18);
            break-inside: avoid;
        }
        .item-media {
            min-height: 138px;
            border-radius: 16px;
            overflow: hidden;
            background: linear-gradient(135deg, #dbeafe, #e0f2fe);
        }
        .item-media img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .item-body {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .item-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
        }
        .item-kicker {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 5px 10px;
            border-radius: 999px;
            background: #ecfeff;
            color: #0f766e;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .item-title {
            margin-top: 8px;
            font-size: 19px;
            line-height: 1.2;
            color: #0f172a;
        }
        .item-subtitle {
            margin-top: 5px;
            color: #64748b;
            font-size: 13px;
        }
        .item-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }
        .detail-card {
            padding: 10px 12px;
            border-radius: 14px;
            background: #f8fafc;
            border: 1px solid rgba(148, 163, 184, 0.16);
        }
        .detail-label {
            display: block;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #0f766e;
            margin-bottom: 4px;
        }
        .detail-value {
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
        }
        .item-notes {
            padding: 12px 14px;
            border-left: 4px solid #0f766e;
            border-radius: 14px;
            background: #f8fafc;
            color: #334155;
            font-size: 13px;
            white-space: pre-wrap;
        }
        .item-note-label {
            display: block;
            margin-bottom: 4px;
            color: #0f766e;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .footer {
            margin-top: 26px;
            padding-top: 18px;
            border-top: 1px solid rgba(148, 163, 184, 0.24);
            color: #64748b;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
        }
        @media print {
            body { background: #fff; padding: 0; }
            .export-sheet { box-shadow: none; border-radius: 0; border: 0; }
        }
        @media (max-width: 760px) {
            body { padding: 0; }
            .hero, .content { padding-left: 18px; padding-right: 18px; }
            .item { grid-template-columns: 1fr; }
            .item-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="export-sheet">
        <section class="hero">
            <span class="eyebrow">SmartFare itinerary export</span>
            <h1>${this.escapeHtml(data.title)}</h1>
            <p class="hero-subtitle">${this.escapeHtml(data.location)} - ${this.escapeHtml(data.dates.start)} / ${this.escapeHtml(data.dates.end)}</p>
            <div class="meta-row">
                <div class="meta-pill">📍 ${this.escapeHtml(data.location)}</div>
                <div class="meta-pill">📅 ${this.escapeHtml(data.dates.start)} - ${this.escapeHtml(data.dates.end)}</div>
                <div class="meta-pill">🕒 Generato il ${new Date(data.generatedAt).toLocaleString('it-IT')}</div>
            </div>
        </section>

        <section class="content">
            ${data.days.map(day => `
            <div class="day">
                <div class="day-header">
                    <h2>Giorno ${day.day}</h2>
                    <span class="day-count">${day.items.length} elementi</span>
                </div>

                ${day.items.map(item => `
                <article class="item">
                    ${item.imageUrl ? `
                    <div class="item-media">
                        <img src="${this.escapeHtml(item.imageUrl)}" alt="${this.escapeHtml(item.title)}" crossorigin="anonymous">
                    </div>
                    ` : ''}

                    <div class="item-body">
                        <div class="item-head">
                            <div>
                                <span class="item-kicker">${item.type === 'accommodation' ? 'Hotel' : 'Attivita'}</span>
                                <h3 class="item-title">${this.escapeHtml(item.title)}</h3>
                                ${item.subtitle ? `<div class="item-subtitle">${this.escapeHtml(item.subtitle)}</div>` : ''}
                            </div>
                        </div>

                        <div class="item-grid">
                            ${item.checkIn ? `
                            <div class="detail-card">
                                <span class="detail-label">Check-in</span>
                                <span class="detail-value">${this.escapeHtml(item.checkIn)}</span>
                            </div>
                            ` : ''}

                            ${item.checkOut ? `
                            <div class="detail-card">
                                <span class="detail-label">Check-out</span>
                                <span class="detail-value">${this.escapeHtml(item.checkOut)}</span>
                            </div>
                            ` : ''}

                            ${item.startAt ? `
                            <div class="detail-card">
                                <span class="detail-label">Inizio</span>
                                <span class="detail-value">${this.escapeHtml(item.startAt)}</span>
                            </div>
                            ` : ''}

                            ${item.endAt ? `
                            <div class="detail-card">
                                <span class="detail-label">Fine</span>
                                <span class="detail-value">${this.escapeHtml(item.endAt)}</span>
                            </div>
                            ` : ''}

                            ${item.duration ? `
                            <div class="detail-card">
                                <span class="detail-label">Durata</span>
                                <span class="detail-value">${this.escapeHtml(item.duration)}</span>
                            </div>
                            ` : ''}
                        </div>

                        ${item.notes ? `
                        <div class="item-notes">
                            <span class="item-note-label">Note</span>
                            ${this.escapeHtml(item.notes)}
                        </div>
                        ` : ''}
                    </div>
                </article>
                `).join('')}
            </div>
            `).join('')}

            <div class="footer">
                <span>SmartFare</span>
            </div>
        </section>
    </div>
</body>
</html>
    `;
        return html;
    }

    /**
     * Downloads a file
     */
    downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    private groupByDay(items: ItineraryItem[]): Map<number, ItineraryItem[]> {
        const grouped = new Map<number, ItineraryItem[]>();
        for (const item of items) {
            const day = item.dayNumber || 1;
            if (!grouped.has(day)) {
                grouped.set(day, []);
            }
            grouped.get(day)!.push(item);
        }
        return grouped;
    }

    private getPoiForItem(item: ItineraryItem, pois: Map<string, BuilderPoi>): BuilderPoi | undefined {
        if (item.accommodationId) {
            return pois.get(`accommodation-${item.accommodationId}`);
        } else if (item.activityId) {
            return pois.get(`activity-${item.activityId}`);
        }
        return undefined;
    }

    private calculateDuration(start?: string | null, end?: string | null): string | undefined {
        if (!start || !end) return undefined;
        const startMin = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
        const endMin = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
        const duration = endMin - startMin;
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    private formatClock(value?: string | null): string | undefined {
        if (!value) return undefined;
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        return trimmed;
    }

    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}
