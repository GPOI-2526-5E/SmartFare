import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { ItineraryService } from '../../../core/services/itinerary.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { Itinerary, ItineraryItem, ItineraryWorkspace } from '../../../core/models/itinerary.model';
import Location from '../../../core/models/location.model';
import { BuilderPoi } from '../../../core/models/builder.types';
import { PreviewHeroComponent } from './preview-hero/preview-hero.component';
import { PreviewTimelineComponent } from './preview-timeline/preview-timeline.component';
import { PreviewMapPanelComponent } from './preview-map-panel/preview-map-panel.component';
import { PreviewActionsComponent } from './preview-actions/preview-actions.component';
import { PreviewDay, PreviewStop } from './preview.types';

@Component({
  selector: 'app-itinerary-preview',
  standalone: true,
  imports: [
    CommonModule,
    PreviewHeroComponent,
    PreviewTimelineComponent,
    PreviewMapPanelComponent,
    PreviewActionsComponent,
  ],
  templateUrl: './itinerary-preview.component.html',
  styleUrl: './itinerary-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItineraryPreviewComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly itineraryService = inject(ItineraryService);
  readonly authService = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly destroy$ = new Subject<void>();

  readonly itinerary = signal<Itinerary | null>(null);
  readonly workspace = signal<ItineraryWorkspace | null>(null);
  readonly isLoading = signal(true);
  readonly isFavorite = signal(false);
  readonly isSaving = signal(false);
  readonly isCopying = signal(false);
  readonly mobileTab = signal<'plan' | 'map'>('plan');

  private readonly currentUser = signal<{ userId?: number } | null>(null);

  readonly isOwner = computed(() => {
    const itin = this.itinerary();
    const user = this.currentUser();
    return !!(itin?.userId && user?.userId && itin.userId === user.userId);
  });

  readonly isReadOnlyViewer = computed(() => !this.isOwner());

  readonly durationLabel = computed(() => {
    const days = this.dayCount();
    if (days <= 0) return 'Itinerario';
    return days === 1 ? '1 giorno' : `${days} giorni`;
  });

  readonly coverImage = computed(() => {
    const itin = this.itinerary();
    if (itin?.imageUrl) return itin.imageUrl;
    const firstWithImage = this.previewStops().find((stop) => stop.imageUrl);
    return firstWithImage?.imageUrl || null;
  });

  readonly locationLabel = computed(() => {
    return (
      this.workspace()?.location?.name ||
      this.itinerary()?.location?.name ||
      'Destinazione'
    );
  });

  readonly authorName = computed(() => {
    const profile = this.itinerary()?.user?.profile;
    if (!profile) return null;
    const name = [profile.name, profile.surname].filter(Boolean).join(' ').trim();
    return name || null;
  });

  readonly previewDays = computed(() => this.buildPreviewDays());
  readonly previewStops = computed(() => this.previewDays().flatMap((day) => day.stops));
  readonly hasStops = computed(() => this.previewStops().length > 0);
  readonly stopCount = computed(() => this.previewStops().length);

  readonly mapPois = computed<BuilderPoi[]>(() => {
    const itin = this.itinerary();
    if (!itin?.items?.length) return [];

    return [...itin.items]
      .sort((a, b) => {
        if ((a.dayNumber || 1) !== (b.dayNumber || 1)) return (a.dayNumber || 1) - (b.dayNumber || 1);
        return (a.orderInt || 0) - (b.orderInt || 0);
      })
      .map((item, index) => this.itemToPoi(item, index + 1))
      .filter((poi): poi is BuilderPoi => !!poi);
  });

  readonly mapLocation = computed<Location | null>(() => {
    const wsLoc = this.workspace()?.location;
    if (wsLoc && this.hasValidCoords(wsLoc.latitude, wsLoc.longitude)) {
      return wsLoc;
    }

    const itinLoc = this.itinerary()?.location;
    if (itinLoc && this.hasValidCoords(itinLoc.latitude, itinLoc.longitude)) {
      return itinLoc;
    }

    const first = this.mapPois()[0];
    if (!first) return null;

    return {
      id: -1,
      name: this.locationLabel(),
      province: '',
      cap: '',
      latitude: first.latitude,
      longitude: first.longitude,
    };
  });

  readonly mapCanRender = computed(() => {
    if (this.isLoading()) return false;
    const itin = this.itinerary();
    if (!itin) return false;
    if (itin.locationId && !this.workspace()) return false;
    return Boolean(this.mapLocation()) || this.mapPois().length > 0;
  });

  ngOnInit() {
    this.currentUser.set(this.authService.getUserData());
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const itineraryId = Number.parseInt(params['itineraryId'], 10);
      if (Number.isFinite(itineraryId)) {
        this.loadItinerary(itineraryId);
        this.checkFavorite(itineraryId);
      } else {
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setMobileTab(tab: 'plan' | 'map') {
    this.mobileTab.set(tab);
  }

  async toggleFavorite() {
    const itin = this.itinerary();
    if (!itin?.id) return;
    if (!this.authService.IsAuthenticated()) {
      this.alertService.warning('Accedi per aggiungere ai preferiti');
      await this.router.navigate(['/login']);
      return;
    }
    this.isSaving.set(true);
    try {
      if (this.isFavorite()) {
        await firstValueFrom(this.itineraryService.removeFromFavorites(itin.id));
        this.isFavorite.set(false);
        this.alertService.success('Rimosso dai preferiti');
      } else {
        await firstValueFrom(this.itineraryService.addToFavorites(itin.id));
        this.isFavorite.set(true);
        this.alertService.success('Aggiunto ai preferiti');
      }
    } catch {
      this.alertService.error('Errore durante la modifica dei preferiti');
    } finally {
      this.isSaving.set(false);
    }
  }

  async primaryAction() {
    if (this.isOwner()) {
      await this.openInBuilder();
    } else {
      await this.copyItinerary();
    }
  }

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      void this.router.navigate(['/discover']);
    }
  }

  private async openInBuilder() {
    const itin = this.itinerary();
    if (!itin) return;
    this.isSaving.set(true);
    try {
      this.itineraryService.setCurrentItinerary(itin, { autosave: false });
      await this.router.navigate(['/itineraries/builder'], { queryParams: { itineraryId: itin.id } });
    } catch {
      this.alertService.error('Impossibile aprire il builder');
    } finally {
      this.isSaving.set(false);
    }
  }

  private async copyItinerary() {
    const itin = this.itinerary();
    if (!itin) return;
    if (!this.authService.IsAuthenticated()) {
      this.alertService.warning('Accedi per incorporare questo itinerario');
      await this.router.navigate(['/login']);
      return;
    }
    this.isCopying.set(true);
    try {
      const copied = await firstValueFrom(this.itineraryService.copyItinerary(itin));
      if (copied?.id) {
        this.alertService.success(`Itinerario "${copied.name}" salvato`);
        await this.router.navigate(['/itineraries/builder'], { queryParams: { itineraryId: copied.id } });
      } else {
        this.alertService.error('Errore durante il salvataggio');
      }
    } catch {
      this.alertService.error('Errore durante il salvataggio');
    } finally {
      this.isCopying.set(false);
    }
  }

  private loadItinerary(id: number) {
    this.isLoading.set(true);
    this.itineraryService.getItineraryById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        if (!data) {
          this.alertService.error('Itinerario non trovato');
          void this.router.navigate(['/discover']);
          this.isLoading.set(false);
          return;
        }
        this.itinerary.set(data);
        if (data.locationId) {
          this.loadWorkspace(data.locationId);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.alertService.error('Impossibile caricare l\'itinerario');
        this.isLoading.set(false);
        void this.router.navigate(['/discover']);
      },
    });
  }

  private loadWorkspace(locationId: number) {
    this.itineraryService.getWorkspace(locationId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (ws) => {
        this.workspace.set(ws);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private checkFavorite(itineraryId: number) {
    if (!this.authService.IsAuthenticated()) return;
    this.itineraryService.isItineraryFavorite(itineraryId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (isFav) => this.isFavorite.set(isFav),
      error: () => undefined,
    });
  }

  private dayCount(): number {
    const items = this.itinerary()?.items || [];
    if (!items.length) return this.itinerary()?.durationDays || 0;
    return Math.max(...items.map((item) => item.dayNumber || 1));
  }

  private buildPreviewDays(): PreviewDay[] {
    const itin = this.itinerary();
    if (!itin?.items?.length) return [];

    const byDay = new Map<number, PreviewStop[]>();

    [...itin.items]
      .sort((a, b) => {
        if ((a.dayNumber || 1) !== (b.dayNumber || 1)) return (a.dayNumber || 1) - (b.dayNumber || 1);
        return (a.orderInt || 0) - (b.orderInt || 0);
      })
      .forEach((item, index) => {
        const stop = this.itemToPreviewStop(item, index + 1);
        if (!stop) return;
        const day = item.dayNumber || 1;
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day)!.push(stop);
      });

    return [...byDay.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dayNumber, stops]) => ({
        dayNumber,
        title: `Giornata ${dayNumber}`,
        dateLabel: this.formatDayDate(itin.startDate, dayNumber),
        stops,
      }));
  }

  private hasValidCoords(lat: number, lng: number): boolean {
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  }

  private resolveEntity(item: ItineraryItem): Record<string, unknown> | null {
    const ws = this.workspace();
    const isAcc = item.itemTypeCode === 'ACCOMMODATION' || !!item.accommodationId;
    const id = isAcc ? item.accommodationId : item.activityId;
    if (!id) return null;

    const embedded = (isAcc ? item.accommodation : item.activity) as Record<string, unknown> | undefined;
    const fromWs = isAcc
      ? ws?.accommodations.find((entry) => entry.id === id)
      : ws?.activities.find((entry) => entry.id === id);

    const wsRecord = fromWs ? (fromWs as unknown as Record<string, unknown>) : null;

    if (embedded && wsRecord) {
      const embLat = Number(embedded['latitude']);
      const embLng = Number(embedded['longitude']);
      const wsLat = Number(wsRecord['latitude']);
      const wsLng = Number(wsRecord['longitude']);

      if (!this.hasValidCoords(embLat, embLng) && this.hasValidCoords(wsLat, wsLng)) {
        return wsRecord;
      }
    }

    return embedded || wsRecord || null;
  }

  private itemToPreviewStop(item: ItineraryItem, order: number): PreviewStop | null {
    const isAcc = item.itemTypeCode === 'ACCOMMODATION' || !!item.accommodationId;
    const type: 'activity' | 'accommodation' = isAcc ? 'accommodation' : 'activity';
    const id = isAcc ? item.accommodationId : item.activityId;
    if (!id) return null;

    const entity = this.resolveEntity(item);
    if (!entity) return null;

    const name = String(entity['name'] || 'Tappa senza nome');
    const street = String(entity['street'] || '');
    const lat = Number(entity['latitude']);
    const lng = Number(entity['longitude']);
    const category = (entity['category'] as { name?: string } | undefined)?.name;

    const mapsUrl =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : street
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${street}`)}`
          : null;

    return {
      key: `${type}-${id}`,
      order,
      dayNumber: item.dayNumber || 1,
      title: name,
      locationLine: street || this.locationLabel(),
      categoryLabel: isAcc ? 'Alloggio' : category || 'Attività',
      note: item.note?.trim() || null,
      timeRange: this.formatTimeRange(item.plannedStartAt, item.plannedEndAt),
      type,
      imageUrl: (entity['imageUrl'] as string) || null,
      mapsUrl,
      iconClass: isAcc ? 'bi-building' : this.iconForCategory(category),
    };
  }

  private itemToPoi(item: ItineraryItem, order: number): BuilderPoi | null {
    const stop = this.itemToPreviewStop(item, order);
    if (!stop) return null;

    const entity = this.resolveEntity(item);
    if (!entity) return null;

    const latitude = Number(entity['latitude']);
    const longitude = Number(entity['longitude']);
    if (!this.hasValidCoords(latitude, longitude)) return null;

    return {
      key: stop.key,
      type: stop.type,
      entityId: Number(entity['id'] ?? (stop.type === 'accommodation' ? item.accommodationId : item.activityId)),
      title: stop.title,
      subtitle: stop.locationLine,
      latitude,
      longitude,
      itemTypeCode: stop.type === 'accommodation' ? 'ACCOMMODATION' : 'ACTIVITY',
      dayNumber: stop.dayNumber,
      note: stop.note,
      plannedStartAt: item.plannedStartAt,
      plannedEndAt: item.plannedEndAt,
      groupName: item.groupName,
      imageUrl: stop.imageUrl,
      orderInt: item.orderInt || order,
    } as BuilderPoi;
  }

  private formatDayDate(startDate: string | null | undefined, dayNumber: number): string {
    if (!startDate) return '';
    const base = new Date(startDate);
    if (Number.isNaN(base.getTime())) return '';
    base.setDate(base.getDate() + Math.max(0, dayNumber - 1));
    return base.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  private formatTimeRange(start?: string | null, end?: string | null): string | null {
    const startTime = this.extractTime(start);
    const endTime = this.extractTime(end);
    if (startTime && endTime) return `${startTime} – ${endTime}`;
    return startTime || endTime || null;
  }

  private extractTime(value?: string | null): string | null {
    if (!value) return null;
    const match = value.match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : null;
  }

  private iconForCategory(category?: string): string {
    const c = (category || '').toLowerCase();
    if (c.includes('ristor') || c.includes('food') || c.includes('bar')) return 'bi-cup-hot';
    if (c.includes('muse')) return 'bi-bank';
    if (c.includes('stazion')) return 'bi-train-front';
    if (c.includes('hotel') || c.includes('allogg')) return 'bi-building';
    return 'bi-geo-alt';
  }
}
