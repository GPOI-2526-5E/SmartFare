import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeaturedItinerariesComponent } from './featured-itineraries.component';

@Component({
  selector: 'app-featured-itineraries-wrapper',
  standalone: true,
  imports: [CommonModule, FeaturedItinerariesComponent],
  template: `
    <app-featured-itineraries [itineraries]="itineraries" [loading]="loading"></app-featured-itineraries>
  `,
})
export class FeaturedItinerariesWrapperComponent implements OnInit, OnDestroy {
  @Input({ required: true }) itineraries: any[] = [];
  @Input() loading = false;

  protected readonly isMobile = signal(false);
  private mm?: MediaQueryList;

  ngOnInit(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      this.isMobile.set(false);
      return;
    }
    this.mm = window.matchMedia('(max-width: 768px)');
    this.isMobile.set(this.mm.matches);
    const listener = (e: MediaQueryListEvent) => this.isMobile.set(e.matches);
    try {
      this.mm.addEventListener('change', listener);
    } catch {
      // @ts-ignore
      this.mm.addListener(listener);
    }
    // store for cleanup
    // @ts-ignore
    (this as any)._mqlListener = listener;
  }

  ngOnDestroy(): void {
    if (!this.mm) return;
    const listener = (this as any)._mqlListener;
    try {
      this.mm.removeEventListener('change', listener);
    } catch {
      // @ts-ignore
      this.mm.removeListener(listener);
    }
  }
}
