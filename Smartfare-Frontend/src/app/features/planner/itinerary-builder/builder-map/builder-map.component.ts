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
  template: `
    <div class="map-container" (click)="mapFocused.emit()">
      <div #mapRoot class="map-root"></div>
      @if (!location) {
        <div class="map-overlay">Seleziona una destinazione per iniziare</div>
      }
    </div>
  `,
  styles: [`
    .map-container {
      height: 100%;
      width: 100%;
      background: #111827;
      position: relative;
    }

    .map-root {
      height: 100%;
      width: 100%;
    }

    .map-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(2, 6, 23, 0.55);
      color: #e2e8f0;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      pointer-events: none;
    }
  `]
})
export class BuilderMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapRoot', { static: true }) mapRoot!: ElementRef<HTMLDivElement>;

  @Input() location: Location | null = null;
  @Input() savedPois: BuilderPoi[] = [];
  @Input() availablePois: BuilderPoi[] = [];
  @Input() previewPoi: BuilderPoi | null = null;
  @Input() markerColor = '#22c55e';

  @Output() mapFocused = new EventEmitter<void>();

  private map?: L.Map;
  private locationLayer = L.layerGroup();
  private savedLayer = L.layerGroup();
  private availableLayer = L.layerGroup();
  private previewLayer = L.layerGroup();

  ngAfterViewInit(): void {
    this.map = L.map(this.mapRoot.nativeElement, {
      zoomControl: true,
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

  private refreshLayers(recenterForLocation = false) {
    if (!this.map) return;

    this.locationLayer.clearLayers();
    this.savedLayer.clearLayers();
    this.availableLayer.clearLayers();
    this.previewLayer.clearLayers();

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

    for (const poi of this.savedPois) {
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
  }
}
