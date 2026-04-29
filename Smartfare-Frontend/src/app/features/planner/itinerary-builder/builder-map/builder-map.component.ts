import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import Location from '../../../../core/models/location.model';
import { BuilderPoi } from '../builder.types';
import { UIStateService } from '../../../../core/services/ui-state.service';

@Component({
  selector: 'app-builder-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './builder-map.component.html',
  styleUrl: './builder-map.component.css'
})
export class BuilderMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapRoot', { static: true }) mapRoot!: ElementRef<HTMLDivElement>;

  @Input() location: Location | null = null;
  @Input() savedPois: BuilderPoi[] = [];
  @Input() routePois: BuilderPoi[] = [];
  @Input() availablePois: BuilderPoi[] = [];
  @Input() previewPoi: BuilderPoi | null = null;
  @Input() markerColor = '#22c55e';

  @Output() mapFocused = new EventEmitter<void>();
  @Output() orderChanged = new EventEmitter<BuilderPoi[]>();

  private map?: L.Map;
  private locationLayer = L.layerGroup();
  private savedLayer = L.layerGroup();
  private availableLayer = L.layerGroup();
  private previewLayer = L.layerGroup();
  private routeLayer = L.layerGroup();
  private endpointLayer = L.layerGroup();
  private routeRequestId = 0;
  private resizeObserver?: ResizeObserver;
  private readonly ui = inject(UIStateService);
  private readonly defaultDayPalette = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#14b8a6'];
  private displayRoutePois: BuilderPoi[] = [];
  private lastRouteFingerprint = '';
  private geometryCache = new Map<number, L.LatLng[]>();
  private metadataCache = new Map<number, { distanceKm: number; durationMin: number }>();

  routeInfo: { distanceKm: number; durationMin: number; steps: number } | null = null;
  dayRouteInfo: Array<{ day: number; distanceKm: number; durationMin: number; color: string }> = [];
  routeError: string | null = null;
  isRouteLoading = false;
  googleMapsUrl: string | null = null;
  routeOrderMode: 'original' | 'optimized' = 'optimized';

  get routePanelTitle(): string {
    const visibleDay = this.ui.visibleDayRoute();
    return visibleDay === 'all' ? 'Percorso itinerario' : `Percorso Giorno ${visibleDay}`;
  }

  constructor() {
    effect(() => {
      // Subscribe to relevant UI signals
      this.ui.dayRouteColors();
      this.ui.markerColor();
      this.ui.visibleDayRoute();

      // Trigger refresh when they change
      if (this.map) {
        this.refreshLayers(false);
      }
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapRoot.nativeElement, {
      zoomControl: false,
      attributionControl: true
    }).setView([41.9028, 12.4964], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.locationLayer.addTo(this.map);
    this.availableLayer.addTo(this.map);
    this.savedLayer.addTo(this.map);
    this.previewLayer.addTo(this.map);
    this.routeLayer.addTo(this.map);
    this.endpointLayer.addTo(this.map);

    this.map.on('click', () => this.mapFocused.emit());
    this.refreshLayers(true);

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.map) return;
      requestAnimationFrame(() => this.map?.invalidateSize({ animate: false }));
    });

    this.resizeObserver.observe(this.mapRoot.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    const locationChanged = !!changes['location'];
    this.refreshLayers(locationChanged);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  setRouteOrderMode(mode: 'original' | 'optimized') {
    if (this.routeOrderMode === mode) return;

    this.routeOrderMode = mode;
    if (!this.map) return;

    if (mode === 'optimized') {
      const optimized = this.getDisplayRoutePois();
      this.orderChanged.emit(optimized);
    }

    this.refreshLayers(false);
  }

  private refreshLayers(recenterForLocation = false) {
    if (!this.map) return;

    this.locationLayer.clearLayers();
    this.savedLayer.clearLayers();
    this.availableLayer.clearLayers();
    this.previewLayer.clearLayers();
    this.routeLayer.clearLayers();
    this.endpointLayer.clearLayers();

    if (this.location && recenterForLocation) {
      this.map.setView([this.location.latitude, this.location.longitude], 12);
    }

    for (const poi of this.availablePois) {
      let marker: L.Layer;

      if (poi.type === 'accommodation') {
        const icon = this.createTypeIcon('accommodation', 'var(--text-color-muted)');
        marker = L.marker([poi.latitude, poi.longitude], { icon });
      } else {
        marker = L.circleMarker([poi.latitude, poi.longitude], {
          radius: 8,
          color: 'var(--glass-border)',
          fillColor: 'var(--text-color-muted)',
          fillOpacity: 0.65,
          weight: 1.5
        });
      }

      marker.bindPopup(this.createPopupHtml(poi));
      this.availableLayer.addLayer(marker);
    }

    this.displayRoutePois = this.getDisplayRoutePois();
    const routeOrder = this.buildRouteOrderByDay(this.displayRoutePois);

    const customColors = this.ui.dayRouteColors();
    const visibleDay = this.ui.visibleDayRoute();

    for (const poi of this.savedPois) {
      const day = poi.dayNumber || 1;
      // Filter by visible day if not 'all'
      if (visibleDay !== 'all' && day !== visibleDay) continue;

      const orderNumber = routeOrder.get(poi.key);

      if (orderNumber) {
        const day = poi.dayNumber || 1;
        const dayColor = customColors[day] || this.defaultDayPalette[(day - 1) % this.defaultDayPalette.length];
        const stopLabel = visibleDay === 'all'
          ? `Giorno ${day} - Tappa ${orderNumber}`
          : `Tappa ${orderNumber}`;
        const icon = this.createStopIcon(orderNumber, dayColor, poi.type === 'accommodation');
        const marker = L.marker([poi.latitude, poi.longitude], { icon }).bindPopup(
          this.createPopupHtml(poi, stopLabel)
        );
        this.savedLayer.addLayer(marker);
        continue;
      }

      let marker: L.Layer;
      const mColor = this.ui.markerColor();

      if (poi.type === 'accommodation') {
        const icon = this.createTypeIcon('accommodation', mColor);
        marker = L.marker([poi.latitude, poi.longitude], { icon });
      } else {
        marker = L.circleMarker([poi.latitude, poi.longitude], {
          radius: 7,
          color: mColor,
          fillColor: mColor,
          fillOpacity: 0.82,
          weight: 2
        });
      }

      marker.bindPopup(this.createPopupHtml(poi, "Salvato nell'itinerario"));
      this.savedLayer.addLayer(marker);
    }

    if (this.previewPoi) {
      const previewMarker = L.circleMarker([this.previewPoi.latitude, this.previewPoi.longitude], {
        radius: 9,
        color: '#f59e0b',
        fillColor: '#fbbf24',
        fillOpacity: 0.95,
        weight: 2
      }).bindPopup(this.createPopupHtml(this.previewPoi, 'Anteprima'));

      this.previewLayer.addLayer(previewMarker);
      this.map.panTo([this.previewPoi.latitude, this.previewPoi.longitude]);
    }

    void this.refreshRoute();
  }

  private async refreshRoute() {
    if (!this.map) return;

    const visibleDay = this.ui.visibleDayRoute();

    const points = this.displayRoutePois
      .filter((poi) => Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude))
      .filter((poi) => visibleDay === 'all' || (poi.dayNumber || 1) === visibleDay)
      .map((poi) => ({
        lat: poi.latitude,
        lng: poi.longitude,
        dayNumber: poi.dayNumber || 1,
        title: poi.title
      }));

    this.googleMapsUrl = this.buildGoogleMapsUrl(points);
    this.dayRouteInfo = [];

    if (points.length < 2) {
      this.routeInfo = null;
      this.routeError = null;
      this.isRouteLoading = false;
      this.drawEndpointMarkers(this.displayRoutePois);
      return;
    }

    const currentFingerprint = points.map(p => `${p.lat},${p.lng},${p.dayNumber}`).join('|');
    const onlyColorsChanged = currentFingerprint === this.lastRouteFingerprint;
    this.lastRouteFingerprint = currentFingerprint;

    if (!onlyColorsChanged) {
      this.geometryCache.clear();
      this.metadataCache.clear();
    }

    const requestId = ++this.routeRequestId;
    this.isRouteLoading = !onlyColorsChanged;
    this.routeError = null;

    try {
      const customColors = this.ui.dayRouteColors();
      const dayBuckets = new Map<number, Array<{ lat: number; lng: number; title: string }>>();

      for (const point of points) {
        const bucket = dayBuckets.get(point.dayNumber) || [];
        bucket.push({ lat: point.lat, lng: point.lng, title: point.title });
        dayBuckets.set(point.dayNumber, bucket);
      }

      const sortedDays = Array.from(dayBuckets.keys()).sort((a, b) => a - b);
      let totalDistance = 0;
      let totalDuration = 0;
      const allDrawnPoints: L.LatLng[] = [];

      for (let index = 0; index < sortedDays.length; index += 1) {
        if (requestId !== this.routeRequestId) return;

        const day = sortedDays[index];
        const dayPoints = dayBuckets.get(day) || [];

        // Skip if not the visible day
        if (visibleDay !== 'all' && day !== visibleDay) continue;

        const dayColor = customColors[day] || this.defaultDayPalette[index % this.defaultDayPalette.length];

        if (dayPoints.length < 2) {
          this.dayRouteInfo.push({
            day,
            distanceKm: 0,
            durationMin: 0,
            color: dayColor
          });
          continue;
        }

        let latLngs: L.LatLng[] = [];
        let dayDistanceKm = 0;
        let dayDurationMin = 0;

        if (onlyColorsChanged && this.geometryCache.has(day)) {
          latLngs = this.geometryCache.get(day)!;
          const meta = this.metadataCache.get(day)!;
          dayDistanceKm = meta.distanceKm;
          dayDurationMin = meta.durationMin;
        } else {
          const coordinateString = dayPoints.map((p) => `${p.lng},${p.lat}`).join(';');
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=geojson&steps=false`
          );
          const payload = await response.json();

          if (requestId !== this.routeRequestId) return;

          if (!response.ok || payload?.code !== 'Ok' || !Array.isArray(payload?.routes) || !payload.routes[0]) {
            throw new Error('Percorso non disponibile');
          }

          const route = payload.routes[0];
          latLngs = (route.geometry?.coordinates || []).map((coord: number[]) => L.latLng(coord[1], coord[0]));

          if (latLngs.length < 2) {
            throw new Error('Geometria percorso non valida');
          }

          dayDistanceKm = Number((route.distance / 1000).toFixed(1));
          dayDurationMin = Math.max(1, Math.round(route.duration / 60));

          this.geometryCache.set(day, latLngs);
          this.metadataCache.set(day, { distanceKm: dayDistanceKm, durationMin: dayDurationMin });
        }

        allDrawnPoints.push(...latLngs);

        this.routeLayer.addLayer(
          L.polyline(latLngs, {
            color: '#0f172a',
            opacity: 0.3,
            weight: 10,
            lineCap: 'round',
            lineJoin: 'round'
          })
        );

        this.routeLayer.addLayer(
          L.polyline(latLngs, {
            color: dayColor,
            opacity: 0.95,
            weight: 5,
            lineCap: 'round',
            lineJoin: 'round'
          })
        );

        totalDistance += dayDistanceKm;
        totalDuration += dayDurationMin;
        this.dayRouteInfo.push({
          day,
          distanceKm: dayDistanceKm,
          durationMin: dayDurationMin,
          color: dayColor
        });
      }

      this.routeInfo = {
        distanceKm: Number(totalDistance.toFixed(1)),
        durationMin: totalDuration,
        steps: points.length
      };

      this.drawEndpointMarkers(this.displayRoutePois);

      if (!this.previewPoi && allDrawnPoints.length > 1) {
        const bounds = L.latLngBounds(allDrawnPoints);
        this.map.fitBounds(bounds.pad(0.18));
      }
    } catch {
      if (requestId !== this.routeRequestId) return;

      const straightLine = points.map((p) => L.latLng(p.lat, p.lng));
      this.routeLayer.addLayer(
        L.polyline(straightLine, {
          color: '#fb7185',
          opacity: 0.9,
          weight: 4,
          dashArray: '10 8',
          lineCap: 'round',
          lineJoin: 'round'
        })
      );

      this.routeInfo = null;
      this.dayRouteInfo = [];
      this.routeError = 'Percorso stradale non disponibile: mostrata una linea indicativa tra le tappe.';
      this.drawEndpointMarkers(this.displayRoutePois);
    } finally {
      if (requestId === this.routeRequestId) {
        this.isRouteLoading = false;
      }
    }
  }

  private drawEndpointMarkers(pois: BuilderPoi[]) {
    this.endpointLayer.clearLayers();

    if (!pois.length) return;

    const visibleDay = this.ui.visibleDayRoute();
    const visiblePois = pois.filter((poi) => visibleDay === 'all' || (poi.dayNumber || 1) === visibleDay);

    if (!visiblePois.length) return;

    // Group by day
    const dayGroups = new Map<number, BuilderPoi[]>();
    for (const poi of visiblePois) {
      const day = poi.dayNumber || 1;
      const group = dayGroups.get(day) || [];
      group.push(poi);
      dayGroups.set(day, group);
    }

    const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => a - b);
    const customColors = this.ui.dayRouteColors();
    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i];
      const dayPois = dayGroups.get(day)!;
      if (dayPois.length < 1) continue;

      const dayColor = customColors[day] || this.defaultDayPalette[i % this.defaultDayPalette.length];

      const start = dayPois[0];
      const end = dayPois[dayPois.length - 1];

      // Labels
      const startLabel = 'START';
      const endLabel = 'END';

      // Start marker
      const startIcon = this.createEndpointIcon(startLabel, dayColor);
      const startMarker = L.marker([start.latitude, start.longitude], {
        icon: startIcon,
        title: `Partenza Giorno ${day}: ${start.title}`
      }).bindPopup(this.createPopupHtml(start, `GIORNO ${day} - PARTENZA`));
      this.endpointLayer.addLayer(startMarker);

      // End marker (only if different from start)
      if (dayPois.length > 1) {
        const endIcon = this.createEndpointIcon(endLabel, dayColor);
        const endMarker = L.marker([end.latitude, end.longitude], {
          icon: endIcon,
          title: `Arrivo Giorno ${day}: ${end.title}`
        }).bindPopup(this.createPopupHtml(end, `GIORNO ${day} - ARRIVO`));
        this.endpointLayer.addLayer(endMarker);
      }
    }
  }

  private buildRouteOrderByDay(pois: BuilderPoi[]): Map<string, number> {
    const orderMap = new Map<string, number>();
    const dayCounters = new Map<number, number>();

    for (const poi of pois) {
      const day = poi.dayNumber || 1;
      const nextOrder = (dayCounters.get(day) || 0) + 1;
      dayCounters.set(day, nextOrder);
      orderMap.set(poi.key, nextOrder);
    }

    return orderMap;
  }

  private createPopupHtml(poi: BuilderPoi, label?: string): string {
    const isHotel = poi.itemTypeCode === 'ACCOMMODATION';
    const startLabel = isHotel ? 'Check-in' : 'Inizio';
    const endLabel = isHotel ? 'Check-out' : 'Fine';

    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formattedStart = formatDate(poi.plannedStartAt);
    const formattedEnd = formatDate(poi.plannedEndAt);
    const formattedGroupStart = formatDate(poi.groupStartAt);
    const formattedGroupEnd = formatDate(poi.groupEndAt);

    return `
      <div class="map-popup-card">
        ${label ? `<div class="popup-label">${label}</div>` : ''}
        ${poi.imageUrl ? `
          <div class="popup-image" style="background-image: url('${poi.imageUrl}')"></div>
        ` : ''}
        <div class="popup-content">
          <h5 class="popup-title">${poi.title}</h5>
          ${poi.subtitle ? `<div class="popup-subtitle"><i class="bi bi-geo-alt"></i> ${poi.subtitle}</div>` : ''}
          ${poi.groupName ? `
            <div class="popup-group">
              <div class="popup-subtitle popup-subtitle--group">
                <i class="bi bi-collection"></i>
                <span>${poi.groupName}</span>
              </div>
              ${(formattedGroupStart || formattedGroupEnd) ? `
                <div class="popup-planning popup-planning--group">
                  ${formattedGroupStart ? `
                    <div class="planning-item">
                      <span class="p-label">Inizio gruppo:</span>
                      <span class="p-value">${formattedGroupStart}</span>
                    </div>
                  ` : ''}
                  ${formattedGroupEnd ? `
                    <div class="planning-item">
                      <span class="p-label">Fine gruppo:</span>
                      <span class="p-value">${formattedGroupEnd}</span>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${(formattedStart || formattedEnd) ? `
            <div class="popup-planning">
              ${formattedStart ? `
                <div class="planning-item">
                  <span class="p-label">${startLabel}:</span>
                  <span class="p-value">${formattedStart}</span>
                </div>
              ` : ''}
              ${formattedEnd ? `
                <div class="planning-item">
                  <span class="p-label">${endLabel}:</span>
                  <span class="p-value">${formattedEnd}</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private createStopIcon(orderNumber: number, color: string, isAccommodation = false): L.DivIcon {
    const iconHtml = isAccommodation
      ? `<i class="bi bi-building" style="font-size: 8px; margin-right: 2px;"></i>${orderNumber}`
      : orderNumber;

    return L.divIcon({
      className: 'route-stop-icon',
      html: `<div style="width:28px;height:28px;border-radius:999px;background:${color};border:2px solid #f8fafc;box-shadow:0 4px 10px rgba(2,6,23,0.35);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:12px;">${iconHtml}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  private createTypeIcon(type: 'accommodation' | 'activity', color: string): L.DivIcon {
    const icon = type === 'accommodation' ? 'bi-building' : 'bi-geo-alt-fill';
    return L.divIcon({
      className: 'poi-type-icon',
      html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid #f8fafc;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:12px;"><i class="bi ${icon}"></i></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  private createEndpointIcon(label: string, color: string): L.DivIcon {
    const width = Math.max(52, label.length * 8 + 20);
    return L.divIcon({
      className: 'route-endpoint-icon',
      html: `<div style="padding:0 10px;height:26px;border-radius:999px;background:${color};border:2px solid #f8fafc;box-shadow:0 6px 14px rgba(2,6,23,0.45);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:10px;letter-spacing:0.03em;white-space:nowrap;">${label}</div>`,
      iconSize: [width, 26],
      iconAnchor: [width / 2, 13]
    });
  }

  private getDisplayRoutePois(): BuilderPoi[] {
    const base = [...this.routePois].filter(
      (poi) => Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude)
    );

    if (this.routeOrderMode === 'original') {
      return base;
    }

    if (base.length < 3) return base;

    const days = new Map<number, BuilderPoi[]>();
    for (const poi of base) {
      const day = poi.dayNumber || 1;
      const bucket = days.get(day) || [];
      bucket.push(poi);
      days.set(day, bucket);
    }

    const orderedDays = Array.from(days.keys()).sort((a, b) => a - b);
    const optimized: BuilderPoi[] = [];

    for (const day of orderedDays) {
      const dayPois = days.get(day) || [];
      optimized.push(...this.optimizeDayStops(dayPois));
    }

    return optimized;
  }

  private optimizeDayStops(dayPois: BuilderPoi[]): BuilderPoi[] {
    if (dayPois.length < 3) return dayPois;

    const remaining = [...dayPois];
    const route: BuilderPoi[] = [];
    const start = remaining.shift();
    if (!start) return dayPois;

    route.push(start);
    while (remaining.length) {
      const last = route[route.length - 1];
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < remaining.length; i += 1) {
        const candidate = remaining[i];
        const dist = this.haversineDistance(last.latitude, last.longitude, candidate.latitude, candidate.longitude);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestIndex = i;
        }
      }

      const [next] = remaining.splice(nearestIndex, 1);
      route.push(next);
    }

    return route;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  private buildGoogleMapsUrl(points: Array<{ lat: number; lng: number }>): string | null {
    if (points.length < 2) return null;

    const maxWaypoints = 8;
    const origin = `${points[0].lat},${points[0].lng}`;
    const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
    const waypointPoints = points.slice(1, -1).slice(0, maxWaypoints);
    const waypointParam = waypointPoints.map((p) => `${p.lat},${p.lng}`).join('|');

    const params = new URLSearchParams({
      api: '1',
      origin,
      destination,
      travelmode: 'driving'
    });

    if (waypointParam) {
      params.set('waypoints', waypointParam);
    }

    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
}
