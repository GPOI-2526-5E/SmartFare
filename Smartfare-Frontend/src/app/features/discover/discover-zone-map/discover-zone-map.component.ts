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
import 'leaflet.markercluster';
import Location from '../../../core/models/location.model';
import { BuilderPoi } from '../../../core/models/builder.types';
import { buildGoogleMapsSearchUrlFromBuilderPoi } from '../../../core/utils/poi-display.util';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-discover-zone-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div #mapHost class="zone-map-host" role="region" aria-label="Mappa della zona"></div>`,
  styleUrl: './discover-zone-map.component.css'
})
export class DiscoverZoneMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;

  @Input() location: Location | null = null;
  @Input() pois: BuilderPoi[] = [];

  private map?: L.Map;
  private poiLayer!: L.MarkerClusterGroup;
  private resizeObserver?: ResizeObserver;

  private readonly defaultCenter: L.LatLngExpression = [41.9028, 12.4964];
  private readonly defaultZoom = 6;

  ngAfterViewInit(): void {
    let clusterFn: any = (L as any).markerClusterGroup || (L as any).MarkerClusterGroup;

    if (!clusterFn && typeof window !== 'undefined' && (window as any).L) {
      clusterFn = (window as any).L.markerClusterGroup || (window as any).L.MarkerClusterGroup;
    }

    if (clusterFn) {
      this.poiLayer = clusterFn({
        showCoverageOnHover: false,
        maxClusterRadius: 48,
        spiderfyOnMaxZoom: true
      });
    } else {
      console.warn('MarkerClusterGroup not found, falling back to LayerGroup');
      this.poiLayer = L.layerGroup() as any;
    }

    this.map = L.map(this.mapHost.nativeElement, {
      zoomControl: true,
      attributionControl: true
    }).setView(this.defaultCenter, this.defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.poiLayer.addTo(this.map);

    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.mapHost.nativeElement);

    this.refreshMarkers();
    setTimeout(() => this.map?.invalidateSize(), 150);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['location'] || changes['pois']) && this.map) {
      this.refreshMarkers();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private refreshMarkers(): void {
    if (!this.map || !this.poiLayer) return;

    this.poiLayer.clearLayers();
    const markers: L.Marker[] = [];

    for (const poi of this.pois) {
      if (!this.isValidLatLng(poi.latitude, poi.longitude)) continue;
      const icon = this.createCategoryIcon(poi.categoryName, poi.type);
      const marker = L.marker([poi.latitude, poi.longitude], { icon }).bindPopup(
        this.createPopupHtml(poi),
        { maxWidth: 280 }
      );
      markers.push(marker);
    }

    if (markers.length > 0) {
      this.poiLayer.addLayers(markers);
      const bounds = L.latLngBounds(markers.map((m) => m.getLatLng()));
      this.map.fitBounds(bounds.pad(0.12));
      return;
    }

    const loc = this.location;
    if (loc?.latitude != null && loc?.longitude != null) {
      this.map.setView([loc.latitude, loc.longitude], 12);
      return;
    }

    this.map.setView(this.defaultCenter, this.defaultZoom);
  }

  private isValidLatLng(lat?: number | null, lng?: number | null): boolean {
    return Number.isFinite(lat) && Number.isFinite(lng);
  }

  private resolveImageUrl(url?: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${environment.apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private createPopupHtml(poi: BuilderPoi): string {
    const imageUrl = this.resolveImageUrl(poi.imageUrl);
    const mapsLink = buildGoogleMapsSearchUrlFromBuilderPoi(poi);
    const typeLabel = poi.type === 'accommodation' ? 'Hotel' : poi.categoryName || 'Attività';

    return `
      <div class="zone-popup">
        ${imageUrl ? `<div class="zone-popup__img" style="background-image:url('${imageUrl}')"></div>` : ''}
        <div class="zone-popup__body">
          <span class="zone-popup__type">${typeLabel}</span>
          <h4>${poi.title}</h4>
          ${poi.subtitle ? `<p class="zone-popup__sub"><i class="bi bi-geo-alt"></i> ${poi.subtitle}</p>` : ''}
          <div class="zone-popup__meta">
            ${poi.rating ? `<span><i class="bi bi-star-fill"></i> ${poi.rating}</span>` : ''}
            ${poi.price != null ? `<span>${poi.price}€</span>` : ''}
          </div>
          <a href="${mapsLink}" target="_blank" rel="noopener" class="zone-popup__link">
            <i class="bi bi-geo-alt"></i> Apri in Maps
          </a>
        </div>
      </div>
    `;
  }

  private getCategoryVisuals(
    categoryName?: string,
    type?: 'accommodation' | 'activity'
  ): { icon: string; color: string } {
    if (type === 'accommodation') return { icon: 'bi-building', color: '#8b5cf6' };
    if (!categoryName) return { icon: 'bi-geo-alt-fill', color: '#64748b' };

    const n = categoryName.toLowerCase();
    if (n.includes('muse') || n.includes('monument') || n.includes('storico'))
      return { icon: 'bi-bank', color: '#f59e0b' };
    if (n.includes('food') || n.includes('risto') || n.includes('cucina') || n.includes('bar'))
      return { icon: 'bi-cup-hot', color: '#ef4444' };
    if (n.includes('night') || n.includes('club')) return { icon: 'bi-moon-stars', color: '#8b5cf6' };
    if (n.includes('park') || n.includes('parco') || n.includes('nature'))
      return { icon: 'bi-tree', color: '#22c55e' };
    if (n.includes('shop') || n.includes('negozi')) return { icon: 'bi-bag', color: '#ec4899' };
    if (n.includes('sport') || n.includes('fitness')) return { icon: 'bi-trophy', color: '#f97316' };
    if (n.includes('spa') || n.includes('wellness')) return { icon: 'bi-flower2', color: '#06b6d4' };
    if (n.includes('arte') || n.includes('galler')) return { icon: 'bi-palette', color: '#d946ef' };
    if (n.includes('beach') || n.includes('spiaggia')) return { icon: 'bi-water', color: '#0ea5e9' };
    if (n.includes('chies') || n.includes('cattedral')) return { icon: 'bi-bell', color: '#a855f7' };

    return { icon: 'bi-geo-alt-fill', color: '#10b981' };
  }

  private createCategoryIcon(
    categoryName: string | undefined,
    type: 'accommodation' | 'activity'
  ): L.DivIcon {
    const { icon, color } = this.getCategoryVisuals(categoryName, type);
    return L.divIcon({
      className: 'zone-poi-icon',
      html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.875rem;"><i class="bi ${icon}"></i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }
}
