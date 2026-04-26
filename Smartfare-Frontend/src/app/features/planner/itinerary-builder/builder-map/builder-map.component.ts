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
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import Location from '../../../../core/models/location.model';
import { BuilderPoi } from '../builder.types';

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

  private map?: L.Map;
  private locationLayer = L.layerGroup();
  private savedLayer = L.layerGroup();
  private availableLayer = L.layerGroup();
  private previewLayer = L.layerGroup();
  private routeLayer = L.layerGroup();
  private endpointLayer = L.layerGroup();
  private routeRequestId = 0;
  private readonly dayPalette = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#14b8a6'];
  private displayRoutePois: BuilderPoi[] = [];

  routeInfo: { distanceKm: number; durationMin: number; steps: number } | null = null;
  dayRouteInfo: Array<{ day: number; distanceKm: number; durationMin: number; color: string }> = [];
  routeError: string | null = null;
  isRouteLoading = false;
  googleMapsUrl: string | null = null;
  routeOrderMode: 'original' | 'optimized' = 'optimized';

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
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    const locationChanged = !!changes['location'];
    this.refreshLayers(locationChanged);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  setRouteOrderMode(mode: 'original' | 'optimized') {
    if (this.routeOrderMode === mode) return;

    this.routeOrderMode = mode;
    if (!this.map) return;

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

    if (this.location) {
      const locationMarker = L.circleMarker([this.location.latitude, this.location.longitude], {
        radius: 8,
        color: '#38bdf8',
        fillColor: '#0ea5e9',
        fillOpacity: 0.9,
        weight: 2
      }).bindPopup(`<strong>${this.location.name}</strong><br/>Destinazione selezionata`);

      this.locationLayer.addLayer(locationMarker);

      if (recenterForLocation) {
        this.map.setView([this.location.latitude, this.location.longitude], 12);
      }
    }

    for (const poi of this.availablePois) {
      const marker = L.circleMarker([poi.latitude, poi.longitude], {
        radius: 6,
        color: '#f8fafc',
        fillColor: '#94a3b8',
        fillOpacity: 0.25,
        weight: 1
      }).bindPopup(`<strong>${poi.title}</strong><br/>${poi.subtitle || ''}`);

      this.availableLayer.addLayer(marker);
    }

    this.displayRoutePois = this.getDisplayRoutePois();
    const routeOrder = new Map(this.displayRoutePois.map((poi, index) => [poi.key, index + 1]));

    for (const poi of this.savedPois) {
      const orderNumber = routeOrder.get(poi.key);

      if (orderNumber) {
        const icon = this.createStopIcon(orderNumber);
        const marker = L.marker([poi.latitude, poi.longitude], { icon }).bindPopup(
          `<strong>${poi.title}</strong><br/>Tappa ${orderNumber}`
        );
        this.savedLayer.addLayer(marker);
        continue;
      }

      const marker = L.circleMarker([poi.latitude, poi.longitude], {
        radius: 7,
        color: this.markerColor,
        fillColor: this.markerColor,
        fillOpacity: 0.82,
        weight: 2
      }).bindPopup(`<strong>${poi.title}</strong><br/>Salvato nell'itinerario`);

      this.savedLayer.addLayer(marker);
    }

    if (this.previewPoi) {
      const previewMarker = L.circleMarker([this.previewPoi.latitude, this.previewPoi.longitude], {
        radius: 9,
        color: '#f59e0b',
        fillColor: '#fbbf24',
        fillOpacity: 0.95,
        weight: 2
      }).bindPopup(`<strong>${this.previewPoi.title}</strong><br/>Anteprima`);

      this.previewLayer.addLayer(previewMarker);
      this.map.panTo([this.previewPoi.latitude, this.previewPoi.longitude]);
    }

    void this.refreshRoute();
  }

  private async refreshRoute() {
    if (!this.map) return;

    const points = this.displayRoutePois
      .filter((poi) => Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude))
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
      this.drawEndpointMarkers(points);
      return;
    }

    const requestId = ++this.routeRequestId;
    this.isRouteLoading = true;
    this.routeError = null;

    try {
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
        const dayColor = this.dayPalette[index % this.dayPalette.length];

        if (dayPoints.length < 2) {
          this.dayRouteInfo.push({
            day,
            distanceKm: 0,
            durationMin: 0,
            color: dayColor
          });
          continue;
        }

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
        const latLngs = (route.geometry?.coordinates || []).map((coord: number[]) => L.latLng(coord[1], coord[0]));

        if (latLngs.length < 2) {
          throw new Error('Geometria percorso non valida');
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

        const dayDistanceKm = Number((route.distance / 1000).toFixed(1));
        const dayDurationMin = Math.max(1, Math.round(route.duration / 60));

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

      this.drawEndpointMarkers(points);

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
      this.drawEndpointMarkers(points);
    } finally {
      if (requestId === this.routeRequestId) {
        this.isRouteLoading = false;
      }
    }
  }

  private drawEndpointMarkers(points: Array<{ lat: number; lng: number }>) {
    this.endpointLayer.clearLayers();

    if (!points.length) return;

    const startIcon = this.createEndpointIcon('START', '#16a34a');
    const endIcon = this.createEndpointIcon('END', '#dc2626');

    const start = points[0];
    const end = points[points.length - 1];

    const startMarker = L.marker([start.lat, start.lng], { icon: startIcon }).bindPopup('Partenza');
    this.endpointLayer.addLayer(startMarker);

    if (points.length > 1) {
      const endMarker = L.marker([end.lat, end.lng], { icon: endIcon }).bindPopup('Arrivo');
      this.endpointLayer.addLayer(endMarker);
    }
  }

  private createStopIcon(orderNumber: number): L.DivIcon {
    return L.divIcon({
      className: 'route-stop-icon',
      html: `<div style="width:28px;height:28px;border-radius:999px;background:#1d4ed8;border:2px solid #f8fafc;box-shadow:0 4px 10px rgba(2,6,23,0.35);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:12px;">${orderNumber}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  private createEndpointIcon(label: string, color: string): L.DivIcon {
    return L.divIcon({
      className: 'route-endpoint-icon',
      html: `<div style="padding:0 10px;height:26px;border-radius:999px;background:${color};border:2px solid #f8fafc;box-shadow:0 6px 14px rgba(2,6,23,0.45);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:10px;letter-spacing:0.03em;">${label}</div>`,
      iconSize: [52, 26],
      iconAnchor: [26, 13]
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
