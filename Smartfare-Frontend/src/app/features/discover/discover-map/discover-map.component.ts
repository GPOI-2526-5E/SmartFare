import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import Location from '../../../core/models/location.model';

export interface DiscoverRoutePoint {
  lat: number;
  lng: number;
  label?: string;
}

@Component({
  selector: 'app-discover-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div #mapHost class="disc-map-host" role="region" aria-label="Mappa itinerario"></div>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 320px;
      }
      .disc-map-host {
        width: 100%;
        height: 100%;
        min-height: inherit;
        border-radius: inherit;
        background: #e8eef4;
      }
      :host ::ng-deep .disc-map-pin span {
        display: block;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
      :host ::ng-deep .disc-map-pin--start span {
        background: #22c55e;
      }
      :host ::ng-deep .disc-map-pin--end span {
        background: #ef4444;
      }
      :host ::ng-deep .disc-map-pin--single span {
        background: #8b5cf6;
      }
    `
  ]
})
export class DiscoverMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;

  @Input() location: Location | null = null;
  @Input() routePoints: DiscoverRoutePoint[] = [];
  @Input() label = '';

  private map?: L.Map;
  private routeLayer = L.layerGroup();
  private markerLayer = L.layerGroup();
  private resizeObserver?: ResizeObserver;
  private routeRequestId = 0;

  private readonly defaultCenter: L.LatLngExpression = [41.9028, 12.4964];
  private readonly defaultZoom = 6;
  private readonly routeColor = '#8b5cf6';

  ngAfterViewInit(): void {
    this.map = L.map(this.mapHost.nativeElement, {
      zoomControl: true,
      attributionControl: true
    }).setView(this.defaultCenter, this.defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.routeLayer.addTo(this.map);
    this.markerLayer.addTo(this.map);

    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.mapHost.nativeElement);

    void this.renderRoute();
    setTimeout(() => this.map?.invalidateSize(), 150);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['location'] || changes['routePoints']) && this.map) {
      void this.renderRoute();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private async fetchWalkingGeometry(
    points: DiscoverRoutePoint[]
  ): Promise<L.LatLng[]> {
    const coordinateString = points.map((p) => `${p.lng},${p.lat}`).join(';');

    let response: Response;
    try {
      response = await fetch(
        `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coordinateString}?overview=full&geometries=geojson&steps=false`
      );
      if (!response.ok || response.status === 502 || response.status === 429) {
        throw new Error('fallback');
      }
    } catch {
      response = await fetch(
        `https://router.project-osrm.org/route/v1/foot/${coordinateString}?overview=full&geometries=geojson&steps=false`
      );
    }

    if (!response.ok) {
      throw new Error(`routing ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.code !== 'Ok' || !payload?.routes?.[0]) {
      throw new Error('no route');
    }

    const coords: number[][] = payload.routes[0].geometry?.coordinates ?? [];
    const latLngs = coords.map((c) => L.latLng(c[1], c[0]));
    if (latLngs.length < 2) throw new Error('invalid geometry');
    return latLngs;
  }

  private drawStraightFallback(points: DiscoverRoutePoint[]): void {
    const latlngs = points.map((p) => L.latLng(p.lat, p.lng));
    this.routeLayer.addLayer(
      L.polyline(latlngs, {
        color: '#fb7185',
        weight: 4,
        opacity: 0.85,
        dashArray: '10 8',
        lineJoin: 'round'
      })
    );
    this.map?.fitBounds(L.latLngBounds(latlngs).pad(0.15));
  }

  private addEndpointMarkers(points: DiscoverRoutePoint[]): void {
    const start = points[0];
    const end = points[points.length - 1];

    const startIcon = L.divIcon({
      className: 'disc-map-pin disc-map-pin--start',
      html: '<span></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    const endIcon = L.divIcon({
      className: 'disc-map-pin disc-map-pin--end',
      html: '<span></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    this.markerLayer.addLayer(
      L.marker([start.lat, start.lng], { icon: startIcon }).bindPopup(
        `<strong>Partenza</strong>${start.label ? `<br>${start.label}` : ''}`
      )
    );
    if (points.length > 1) {
      this.markerLayer.addLayer(
        L.marker([end.lat, end.lng], { icon: endIcon }).bindPopup(
          `<strong>Arrivo</strong>${end.label ? `<br>${end.label}` : ''}`
        )
      );
    }
  }

  private async renderRoute(): Promise<void> {
    if (!this.map) return;

    const requestId = ++this.routeRequestId;
    this.routeLayer.clearLayers();
    this.markerLayer.clearLayers();

    const points = this.routePoints.filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
    );

    if (points.length >= 2) {
      try {
        const latLngs = await this.fetchWalkingGeometry(points);
        if (requestId !== this.routeRequestId) return;

        this.routeLayer.addLayer(
          L.polyline(latLngs, {
            color: '#0b0914',
            opacity: 0.35,
            weight: 10,
            lineJoin: 'round',
            lineCap: 'round'
          })
        );
        this.routeLayer.addLayer(
          L.polyline(latLngs, {
            color: this.routeColor,
            weight: 5,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round'
          })
        );

        this.addEndpointMarkers(points);
        this.map.fitBounds(L.latLngBounds(latLngs).pad(0.15));
        return;
      } catch {
        if (requestId !== this.routeRequestId) return;
        this.drawStraightFallback(points);
        this.addEndpointMarkers(points);
        return;
      }
    }

    if (points.length === 1) {
      const p = points[0];
      const icon = L.divIcon({
        className: 'disc-map-pin disc-map-pin--single',
        html: '<span></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      this.markerLayer.addLayer(
        L.marker([p.lat, p.lng], { icon }).bindPopup(
          `<strong>${this.label || p.label || 'Destinazione'}</strong>`
        )
      );
      this.map.setView([p.lat, p.lng], 12);
      return;
    }

    const loc = this.location;
    if (loc?.latitude != null && loc?.longitude != null) {
      const icon = L.divIcon({
        className: 'disc-map-pin disc-map-pin--single',
        html: '<span></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      this.markerLayer.addLayer(
        L.marker([loc.latitude, loc.longitude], { icon }).bindPopup(
          `<strong>${this.label || loc.name}</strong>`
        )
      );
      this.map.setView([loc.latitude, loc.longitude], 11);
      return;
    }

    this.map.setView(this.defaultCenter, this.defaultZoom);
  }
}
