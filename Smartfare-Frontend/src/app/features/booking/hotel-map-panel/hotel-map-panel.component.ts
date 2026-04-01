import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  computed,
  input,
  output,
} from '@angular/core';
import * as L from 'leaflet';
import { HotelCard } from '../../../core/models/hotel-booking.models';

@Component({
  selector: 'app-hotel-map-panel',
  standalone: true,
  templateUrl: './hotel-map-panel.component.html',
  styleUrl: './hotel-map-panel.component.css',
})
export class HotelMapPanelComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapCanvas', { static: true }) mapCanvas?: ElementRef<HTMLDivElement>;

  readonly hotels = input.required<HotelCard[]>();
  readonly selectedHotel = input<HotelCard | null>(null);
  readonly selectHotel = output<HotelCard>();

  private map?: L.Map;
  private markers = new Map<number, L.Marker>();

  ngAfterViewInit(): void {
    this.initializeMap();
    this.renderMarkers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) {
      return;
    }

    if (changes['hotels']) {
      this.renderMarkers();
    } else if (changes['selectedHotel']) {
      this.refreshMarkerStyles();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  readonly externalMapUrl = computed(() => {
    const hotel = this.selectedHotel();

    if (!hotel?.latitude || !hotel?.longitude) {
      return '';
    }

    return `https://www.openstreetmap.org/?mlat=${hotel.latitude}&mlon=${hotel.longitude}#map=15/${hotel.latitude}/${hotel.longitude}`;
  });

  private initializeMap(): void {
    if (!this.mapCanvas) {
      return;
    }

    this.map = L.map(this.mapCanvas.nativeElement, {
      zoomControl: false,
    }).setView([44.0678, 12.5695], 12);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  private renderMarkers(): void {
    if (!this.map) {
      return;
    }

    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();

    const coordinates: L.LatLngExpression[] = [];

    for (const hotel of this.hotels()) {
      if (!hotel.latitude || !hotel.longitude) {
        continue;
      }

      const marker = L.marker([hotel.latitude, hotel.longitude], {
        icon: this.buildMarkerIcon(hotel.hotelId === this.selectedHotel()?.hotelId),
      });

      marker.on('click', () => this.selectHotel.emit(hotel));
      marker.on('mouseover', () => marker.openPopup());
      marker.on('mouseout', () => marker.closePopup());
      marker.bindPopup(this.buildPopupHtml(hotel), {
        offset: [0, -18],
        autoClose: false,
        closeButton: false,
        className: 'hotel-popup',
      });

      marker.addTo(this.map);
      this.markers.set(hotel.hotelId, marker);
      coordinates.push([hotel.latitude, hotel.longitude]);
    }

    this.refreshMarkerStyles();

    if (coordinates.length > 1) {
      this.map.fitBounds(L.latLngBounds(coordinates), { padding: [42, 42] });
      return;
    }

    if (coordinates.length === 1) {
      this.map.setView(coordinates[0], 14);
    }
  }

  private refreshMarkerStyles(): void {
    const selectedId = this.selectedHotel()?.hotelId;

    this.markers.forEach((marker, hotelId) => {
      marker.setIcon(this.buildMarkerIcon(hotelId === selectedId));
      if (hotelId === selectedId) {
        marker.openPopup();
      }
    });
  }

  private buildMarkerIcon(isSelected: boolean): L.DivIcon {
    const className = isSelected ? 'map-marker selected' : 'map-marker';
    return L.divIcon({ className, iconSize: [20, 20] });
  }

  private buildPopupHtml(hotel: HotelCard): string {
    const safeName = this.escapeHtml(hotel.name);
    const safePrice = this.escapeHtml(hotel.price);

    return `
      <div class="popup-card">
        <img src="${hotel.previewImage}" alt="${safeName}" />
        <div class="popup-copy">
          <strong>${safeName}</strong>
          <span>${safePrice} / notte</span>
        </div>
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
