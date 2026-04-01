import { Component, computed, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HotelCard } from '../../../core/models/hotel-booking.models';

@Component({
  selector: 'app-hotel-map-panel',
  standalone: true,
  templateUrl: './hotel-map-panel.component.html',
  styleUrl: './hotel-map-panel.component.css',
})
export class HotelMapPanelComponent {
  readonly selectedHotel = input<HotelCard | null>(null);

  constructor(private sanitizer: DomSanitizer) {}

  readonly mapUrl = computed<SafeResourceUrl | null>(() => {
    const hotel = this.selectedHotel();

    if (!hotel?.latitude || !hotel?.longitude) {
      return null;
    }

    const latitude = hotel.latitude;
    const longitude = hotel.longitude;
    const delta = 0.02;
    const bbox = [
      longitude - delta,
      latitude - delta,
      longitude + delta,
      latitude + delta,
    ].join('%2C');

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`
    );
  });

  readonly externalMapUrl = computed(() => {
    const hotel = this.selectedHotel();

    if (!hotel?.latitude || !hotel?.longitude) {
      return '';
    }

    return `https://www.openstreetmap.org/?mlat=${hotel.latitude}&mlon=${hotel.longitude}#map=15/${hotel.latitude}/${hotel.longitude}`;
  });
}
