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
  readonly dayRouteColors = signal<Record<number, string>>({});
  readonly visibleDayRoute = signal<number | 'all'>('all');
  readonly selectedDay = signal<number>(1);

  private readonly defaultDayPalette = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#14b8a6'];

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

  setDayColor(day: number, color: string) {
    this.dayRouteColors.update(prev => ({ ...prev, [day]: color }));
  }

  setVisibleDayRoute(day: number | 'all') {
    this.visibleDayRoute.set(day);
    // If we select a specific day for the route, also update the active day for adding items
    if (day !== 'all') {
      this.selectedDay.set(day);
    }
  }

  setSelectedDay(day: number) {
    this.selectedDay.set(day);
  }

  getDefaultDayColor(day: number): string {
    return this.defaultDayPalette[(day - 1) % this.defaultDayPalette.length];
  }

  toggleSummary() {
    this.showSummary.update(v => !v);
  }
}
