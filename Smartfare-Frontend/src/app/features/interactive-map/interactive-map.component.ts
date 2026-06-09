import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { NavbarComponent } from '../ui/navbar/navbar.component';
import { ActivityService } from '../../core/services/activity.service';
import { GeocodingService } from '../../core/services/geocoding.service';
import { environment } from '../../../environments/environment';
import {
  MapCategoryFilter,
  MapCategoryOption,
  MapMarker,
  MapMarkerKind
} from './models/map-marker.model';
import { BboxTileCache } from './utils/bbox-tile-cache';
import { categoryIcon, categoryVisuals, colorFromId } from './utils/map-category.util';
import { buildGoogleMapsSearchUrl } from '../../core/utils/poi-display.util';

interface BboxRequest {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  zoom: number;
  zoomBucket: string;
  force: boolean;
  scope: string;
  categoryId?: number;
}

@Component({
  selector: 'app-interactive-map',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './interactive-map.component.html',
  styleUrl: './interactive-map.component.css'
})
export class InteractiveMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;

  private readonly activityService = inject(ActivityService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly destroyRef = inject(DestroyRef);

  private map?: L.Map;
  private clusterGroup!: L.LayerGroup;
  private resizeObserver?: ResizeObserver;
  private readonly tileCache = new BboxTileCache(0.35);
  private readonly poiByKey = new Map<string, MapMarker>();
  private readonly leafletMarkers = new Map<string, L.Marker>();
  private readonly bboxSubject = new Subject<BboxRequest>();
  private suppressMoveEnd = false;

  readonly sidebarOpen = signal(true);
  readonly mobileSidebarOpen = signal(false);
  readonly activeFilter = signal<MapCategoryFilter>('all');
  readonly categories = signal<MapCategoryOption[]>([]);
  readonly hasHotels = signal(false);
  readonly isFetching = signal(false);
  readonly fetchError = signal<string | null>(null);
  readonly totalLoaded = signal(0);
  readonly placeQuery = signal('');
  readonly isSearchingPlace = signal(false);

  readonly visibleCount = computed(() => {
    const filter = this.activeFilter();
    let count = 0;
    for (const poi of this.poiByKey.values()) {
      if (this.matchesFilter(poi, filter)) count++;
    }
    return count;
  });

  ngAfterViewInit(): void {
    document.documentElement.classList.add('im-no-scroll');
    document.body.classList.add('im-no-scroll');

    this.initMap();
    this.loadCategories();
    this.bindBboxPipeline();
    this.queueViewportLoad();
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('im-no-scroll');
    document.body.classList.remove('im-no-scroll');

    this.resizeObserver?.disconnect();
    this.bboxSubject.complete();
    this.map?.off();
    this.map?.remove();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
    setTimeout(() => this.map?.invalidateSize({ animate: false }), 320);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((v) => !v);
  }

  onPlaceQueryInput(value: string): void {
    this.placeQuery.set(value);
  }

  searchPlace(): void {
    const query = this.placeQuery().trim();
    if (!query || !this.map) return;

    this.isSearchingPlace.set(true);
    this.fetchError.set(null);

    this.geocodingService
      .search(query)
      .pipe(
        finalize(() => this.isSearchingPlace.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (results) => {
          const first = results[0];
          if (!first) {
            this.fetchError.set('Nessun luogo trovato. Prova con un nome più preciso.');
            return;
          }

          const lat = Number(first.lat);
          const lng = Number(first.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            this.fetchError.set('Coordinate non valide restituite dalla ricerca.');
            return;
          }

          this.runWithoutMoveEnd(() => {
            this.map?.flyTo([lat, lng], 15, { animate: true, duration: 0.8 });
          });
          this.queueViewportLoad(true);
          this.mobileSidebarOpen.set(false);
        },
        error: () => {
          this.fetchError.set('Errore durante la ricerca del luogo. Riprova tra poco.');
        }
      });
  }

  setFilter(filter: MapCategoryFilter): void {
    this.activeFilter.set(filter);
    this.syncMarkersOnMap();
    this.mobileSidebarOpen.set(false);

    this.queueViewportLoad(true);
  }

  locateMe(): void {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.runWithoutMoveEnd(() => {
          this.map?.setView([pos.coords.latitude, pos.coords.longitude], 11, { animate: true });
        });
        this.queueViewportLoad(true);
      },
      () => {
        this.fetchError.set('Impossibile ottenere la posizione. Controlla i permessi del browser.');
      }
    );
  }

  private initMap(): void {
    this.map = L.map(this.mapHost.nativeElement, {
      zoomControl: false,
      attributionControl: true
    }).setView([41.9028, 12.4964], 6);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    let clusterFn: any = (L as any).markerClusterGroup || (L as any).MarkerClusterGroup;

    if (!clusterFn && typeof window !== 'undefined' && (window as any).L) {
      clusterFn = (window as any).L.markerClusterGroup || (window as any).L.MarkerClusterGroup;
    }

    if (clusterFn) {
      this.clusterGroup = clusterFn({
        chunkedLoading: true,
        chunkInterval: 80,
        maxClusterRadius: 56,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          const label = count > 999 ? '999+' : count > 99 ? '99+' : String(count);

          return L.divIcon({
            className: 'im-cluster',
            html: `<div class="im-cluster__bubble">${label}</div>`,
            iconSize: [48, 48],
            iconAnchor: [24, 24]
          });
        }
      });
    } else {
      console.warn('MarkerClusterGroup not found, falling back to LayerGroup');
      this.clusterGroup = L.layerGroup() as any;
    }
    this.clusterGroup.addTo(this.map);

    this.map.on('moveend', () => {
      if (this.suppressMoveEnd) return;
      this.queueViewportLoad();
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.map?.invalidateSize({ animate: false });
    });
    this.resizeObserver.observe(this.mapHost.nativeElement);

    setTimeout(() => this.map?.invalidateSize({ animate: false }), 200);
  }

  private bindBboxPipeline(): void {
    this.bboxSubject
      .pipe(
        debounceTime(280),
        distinctUntilChanged(
          (a, b) =>
            a.minLat === b.minLat &&
            a.maxLat === b.maxLat &&
            a.minLng === b.minLng &&
            a.maxLng === b.maxLng &&
            a.zoom === b.zoom &&
            a.zoomBucket === b.zoomBucket &&
            a.force === b.force &&
            a.scope === b.scope &&
            a.categoryId === b.categoryId
        ),
        switchMap((bbox) => {
          const shouldBypassCache = bbox.scope.startsWith('cat-');
          if (!shouldBypassCache) {
            const missing = this.tileCache.getMissingKeys(
              bbox.minLat,
              bbox.maxLat,
              bbox.minLng,
              bbox.maxLng,
              bbox.zoomBucket
            );
            if (missing.length === 0 && !bbox.force) {
              return of({ bbox, skipped: true as const });
            }
          }

          const limit = this.limitForZoom(bbox.zoom);
          this.isFetching.set(true);
          this.fetchError.set(null);

          return this.activityService
            .getPoisInArea(bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng, limit, bbox.categoryId)
            .pipe(
              catchError(() => {
                this.fetchError.set('Errore nel caricamento dei punti. Riprova tra poco.');
                return of({ activities: [], accommodations: [] });
              }),
              finalize(() => this.isFetching.set(false)),
              switchMap((data) => of({ bbox, skipped: false as const, data }))
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        if (result.skipped) return;

        const markers = this.parseApiResponse(result.data);
        if (result.bbox.scope === 'all') {
          this.tileCache.markLoaded(
            result.bbox.minLat,
            result.bbox.maxLat,
            result.bbox.minLng,
            result.bbox.maxLng,
            result.bbox.zoomBucket
          );
        }
        this.mergeMarkers(markers);
      });
  }

  private loadCategories(): void {
    this.activityService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const used = (res?.categories ?? []).map((c) => {
            const provided = c.iconUrl ?? '';
            const visuals = categoryVisuals(c.name, 'activity');
            const color = colorFromId(c.id);
            // Determine icon and iconUrl: backend may provide a URL (http or /) or a class name (bi-...)
            if (provided) {
              if (provided.startsWith('http') || provided.startsWith('/')) {
                return { id: c.id, name: c.name, icon: visuals.icon, iconUrl: provided, color };
              }
              // treat provided as a bootstrap-icons class
              return { id: c.id, name: c.name, icon: provided, color };
            }
            return { id: c.id, name: c.name, icon: visuals.icon, color };
          });
          this.categories.set(used);
          this.hasHotels.set(res?.hasHotels ?? false);
        },
        error: () => {
          this.fetchError.set('Impossibile caricare le categorie.');
        }
      });
  }

  private queueViewportLoad(force = false): void {
    if (!this.map) return;

    const bounds = this.map.getBounds().pad(0.2);
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const zoom = this.map.getZoom();
    const filter = this.activeFilter();
    const categoryId = typeof filter === 'number' ? filter : undefined;
    const scope = filter === 'hotel' ? 'hotel' : typeof filter === 'number' ? `cat-${filter}` : 'all';
    const zoomBucket = this.zoomBucketFor(zoom);

    if (!force) {
      const missing = this.tileCache.getMissingKeys(sw.lat, ne.lat, sw.lng, ne.lng, zoomBucket);
      if (missing.length === 0) return;
    }

    this.bboxSubject.next({
      minLat: sw.lat,
      maxLat: ne.lat,
      minLng: sw.lng,
      maxLng: ne.lng,
      zoom,
      zoomBucket,
      force,
      scope,
      categoryId
    });
  }

  private zoomBucketFor(zoom: number): string {
    if (zoom < 7) return 'z0-6';
    if (zoom < 9) return 'z7-8';
    if (zoom < 11) return 'z9-10';
    if (zoom < 13) return 'z11-12';
    return 'z13plus';
  }

  private limitForZoom(zoom: number): number {
    if (zoom < 7) return 400;
    if (zoom < 9) return 800;
    if (zoom < 11) return 1500;
    if (zoom < 13) return 2500;
    return 4000;
  }

  private parseApiResponse(data: { activities: any[]; accommodations: any[] }): MapMarker[] {
    const hotels: MapMarker[] = (data.accommodations ?? [])
      .filter((a) => this.isValidCoord(a.latitude, a.longitude))
      .map((a) => ({
        key: `hotel-${a.id}`,
        id: a.id,
        kind: 'hotel' as MapMarkerKind,
        name: a.name,
        street: a.street,
        latitude: a.latitude,
        longitude: a.longitude,
        imageUrl: a.imageUrl,
        rating: a.stars
      }));

    const activities: MapMarker[] = (data.activities ?? [])
      .filter((a) => this.isValidCoord(a.latitude, a.longitude))
      .map((a) => ({
        key: `activity-${a.id}`,
        id: a.id,
        kind: 'activity' as MapMarkerKind,
        name: a.name,
        street: a.street,
        latitude: a.latitude,
        longitude: a.longitude,
        imageUrl: a.imageUrl,
        categoryId: a.categoryId,
        categoryName: a.category?.name
      }));

    return [...hotels, ...activities];
  }

  private mergeMarkers(markers: MapMarker[]): void {
    let added = 0;
    for (const marker of markers) {
      if (this.poiByKey.has(marker.key)) continue;
      this.poiByKey.set(marker.key, marker);
      added++;
    }

    if (added > 0) {
      this.totalLoaded.set(this.poiByKey.size);
      this.syncMarkersOnMap();
    }
  }

  private syncMarkersOnMap(): void {
    if (!this.clusterGroup) return;

    const filter = this.activeFilter();
    const desired = new Set<string>();

    for (const poi of this.poiByKey.values()) {
      if (!this.matchesFilter(poi, filter)) continue;
      desired.add(poi.key);

      if (this.leafletMarkers.has(poi.key)) continue;

      let visuals =
        poi.kind === 'hotel'
          ? categoryVisuals(undefined, 'hotel')
          : categoryVisuals(poi.categoryName, 'activity');

      // If we have a category id, prefer the category metadata loaded earlier
      if (typeof poi.categoryId === 'number') {
        const cat = this.categories().find((x) => x.id === poi.categoryId);
        if (cat) {
          visuals = { icon: cat.icon || visuals.icon, color: cat.color || visuals.color } as any;
        }
      }

      // Build marker HTML: if category provides an image URL, use <img>, otherwise use <i>
      const innerHtml =
        (visuals as any).iconUrl && ((visuals as any).iconUrl.startsWith('http') || (visuals as any).iconUrl.startsWith('/'))
          ? `<img src="${(visuals as any).iconUrl}" alt="" style="width:60%;height:60%;object-fit:contain;border-radius:6px;" />`
          : `<i class="bi ${visuals.icon}"></i>`;

      const icon = L.divIcon({
        className: 'im-poi',
        html: `<div class="im-poi__dot" style="background:${visuals.color}">${innerHtml}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const leafletMarker = L.marker([poi.latitude, poi.longitude], { icon }).bindPopup(
        this.popupHtml(poi),
        { maxWidth: 300 }
      );

      this.leafletMarkers.set(poi.key, leafletMarker);
      this.clusterGroup.addLayer(leafletMarker);
    }

    for (const [key, leafletMarker] of this.leafletMarkers) {
      if (desired.has(key)) continue;
      this.clusterGroup.removeLayer(leafletMarker);
      this.leafletMarkers.delete(key);
    }
  }

  private matchesFilter(poi: MapMarker, filter: MapCategoryFilter): boolean {
    if (filter === 'all') return true;
    if (filter === 'hotel') return poi.kind === 'hotel';
    return poi.kind === 'activity' && poi.categoryId === filter;
  }

  private popupHtml(poi: MapMarker): string {
    const isHotel = poi.kind === 'hotel';
    const mapsLink = buildGoogleMapsSearchUrl({
      name: poi.name,
      street: poi.street,
      categoryName: isHotel ? 'Hotel' : poi.categoryName,
      latitude: poi.latitude,
      longitude: poi.longitude,
    });
    const searchLink = `https://www.google.com/search?q=${encodeURIComponent(poi.name)}`;

    let imageUrl = poi.imageUrl;
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      imageUrl = `${environment.apiUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }
    if (!imageUrl && isHotel) {
      imageUrl =
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800';
    }

    return `
      <div class="im-popup">
        ${imageUrl ? `<div class="im-popup__img" style="background-image:url('${imageUrl}')"></div>` : ''}
        <div class="im-popup__body">
          <span class="im-popup__tag">${isHotel ? 'Hotel' : poi.categoryName || 'Attività'}</span>
          <h4>${poi.name}</h4>
          ${poi.street ? `<p class="im-popup__addr"><i class="bi bi-geo-alt"></i> ${poi.street}</p>` : ''}
          ${poi.rating ? `<p class="im-popup__rating"><i class="bi bi-star-fill"></i> ${poi.rating}</p>` : ''}
          <div class="im-popup__actions">
            <a href="${mapsLink}" target="_blank" rel="noopener">Maps</a>
            <a href="${searchLink}" target="_blank" rel="noopener">Google</a>
          </div>
        </div>
      </div>
    `;
  }

  private isValidCoord(lat: unknown, lng: unknown): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    );
  }

  private runWithoutMoveEnd(action: () => void): void {
    this.suppressMoveEnd = true;
    try {
      action();
    } finally {
      setTimeout(() => {
        this.suppressMoveEnd = false;
      }, 120);
    }
  }
}
