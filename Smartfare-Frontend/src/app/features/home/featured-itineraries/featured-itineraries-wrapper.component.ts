import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeaturedItinerariesComponent } from './featured-itineraries.component';
import { FeaturedItinerariesMobileComponent } from './featured-itineraries-mobile.component';

@Component({
  selector: 'app-featured-itineraries-wrapper',
  standalone: true,
  imports: [CommonModule, FeaturedItinerariesComponent, FeaturedItinerariesMobileComponent],
  template: `
    <ng-container *ngIf="isMobile() === false">
      <app-featured-itineraries [itineraries]="itineraries" [loading]="loading"></app-featured-itineraries>
    </ng-container>
    <ng-container *ngIf="isMobile() === true">
      <app-featured-itineraries-mobile [itineraries]="itineraries" [loading]="loading"></app-featured-itineraries-mobile>
    </ng-container>
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
