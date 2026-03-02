import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingFormComponent } from '../booking-form/booking-form.component';
import { BookingStateService } from '../../services/booking-state.service';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, BookingFormComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  currentImage = signal(0);
  activeTab = signal('ITINERARY');
  intervalId: any;

  private bookingState = inject(BookingStateService);
  protected sidebarService = inject(SidebarService);

  images = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=2000',
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=2000'
  ];

  destinations = [
    { id: 1, name: 'Santorini', country: 'Grecia', price: 299, image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800' },
    { id: 2, name: 'Parigi', country: 'Francia', price: 189, image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800' },
    { id: 3, name: 'Kyoto', country: 'Giappone', price: 850, image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800' },
    { id: 4, name: 'Zermatt', country: 'Svizzera', price: 450, image: 'https://images.unsplash.com/photo-1531310197839-ccf54634509e?auto=format&fit=crop&w=800' }
  ];

  services = [
    { id: 'ITINERARY', label: 'Itinerario', icon: 'bi-map-fill' },
    { id: 'FLIGHT', label: 'Voli', icon: 'bi-airplane-fill' },
    { id: 'TRAIN', label: 'Treni', icon: 'bi-train-front-fill' },
    { id: 'HOTEL', label: 'Hotel', icon: 'bi-building-fill' }
  ];

  selectService(id: string) {
    this.bookingState.setActiveService(id);
    this.activeTab.set(id);
  }

  ngOnInit() {
    this.bookingState.setActiveService('ITINERARY');
    this.intervalId = setInterval(() => {
      this.currentImage.set((this.currentImage() + 1) % this.images.length);
    }, 5000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
