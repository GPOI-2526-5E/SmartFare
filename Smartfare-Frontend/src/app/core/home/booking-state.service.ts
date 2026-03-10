import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BookingStateService {
  // Default è ITINERARY
  activeService = signal<string>('ITINERARY');

  setActiveService(service: string) {
    this.activeService.set(service);
  }

  getActiveService() {
    return this.activeService();
  }
}
