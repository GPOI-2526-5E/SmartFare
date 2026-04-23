import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UIStateService {
  readonly showSidebar = signal(true);
  readonly showChat = signal(true);
  readonly selectedCategory = signal<number | 'all'>('all');
  readonly markerColor = signal('#22c55e'); // Default green

  toggleSidebar() {
    this.showSidebar.update(v => !v);
  }

  toggleChat() {
    this.showChat.update(v => !v);
  }

  setCategory(categoryId: number | 'all') {
    this.selectedCategory.set(categoryId);
  }

  setMarkerColor(color: string) {
    this.markerColor.set(color);
  }
}
