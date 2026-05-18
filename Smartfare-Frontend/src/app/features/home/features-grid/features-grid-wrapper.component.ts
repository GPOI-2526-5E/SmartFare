import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeaturesGridComponent } from './features-grid.component';
import { FeaturesGridMobileComponent } from '../features-grid-mobile/features-grid-mobile.component';

@Component({
  selector: 'app-features-grid-wrapper',
  standalone: true,
  imports: [CommonModule, FeaturesGridComponent, FeaturesGridMobileComponent],
  template: `
    @if (isMobile() === false) {
      <app-features-grid></app-features-grid>
    }
    @if (isMobile() === true) {
      <app-features-grid-mobile></app-features-grid-mobile>
    }
  `,
})
export class FeaturesGridWrapperComponent implements OnInit, OnDestroy {
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
    // prefer modern addEventListener if available
    try {
      this.mm.addEventListener('change', listener);
    } catch {
      // fallback
      // @ts-ignore
      this.mm.addListener(listener);
    }
    // store to remove later
    // @ts-ignore store listener for cleanup
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
