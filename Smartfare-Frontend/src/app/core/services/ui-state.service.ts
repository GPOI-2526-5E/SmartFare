import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UIStateService {
  readonly showSidebar = signal(true);
  readonly showChat = signal(true);
  readonly selectedCategory = signal<number | 'all'>('all');
  readonly selectedType = signal<'all' | 'accommodation' | 'activity'>('all');
  readonly mapView = signal<'selected' | 'all'>('selected');
  readonly activeSurface = signal<'sidebar' | 'map'>('sidebar');
  readonly markerColor = signal('#22c55e'); // Default green
  readonly showSummary = signal(false);

  toggleSidebar() {
    this.showSidebar.update(v => !v);
  }

  toggleChat() {
    this.showChat.update(v => !v);
  }

  setCategory(categoryId: number | 'all') {
    this.selectedCategory.set(categoryId);
  }

  setType(type: 'all' | 'accommodation' | 'activity') {
    this.selectedType.set(type);
  }

  setMapView(mode: 'selected' | 'all') {
    this.mapView.set(mode);
  }

  setActiveSurface(surface: 'sidebar' | 'map') {
    this.activeSurface.set(surface);
  }

  setMarkerColor(color: string) {
    this.markerColor.set(color);
  }

  toggleSummary() {
    this.showSummary.update(v => !v);
  }
}
