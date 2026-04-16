import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostBinding,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type RevealAnimation = 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right';

@Directive({
  selector: '[appRevealOnScroll]',
  standalone: true,
})
export class RevealOnScrollDirective implements AfterViewInit, OnDestroy {
  @Input('appRevealOnScroll') animation: RevealAnimation = 'fade-up';
  @Input() revealDelay = 0;
  @Input() revealOnce = true;
  @Input() revealThreshold = 0.2;

  @HostBinding('class.reveal-on-scroll')
  protected readonly revealClass = true;

  @HostBinding('class.reveal-visible')
  protected isVisible = false;

  @HostBinding('class.reveal-from-up')
  protected get revealFromUp(): boolean {
    return this.animation === 'fade-up';
  }

  @HostBinding('class.reveal-from-down')
  protected get revealFromDown(): boolean {
    return this.animation === 'fade-down';
  }

  @HostBinding('class.reveal-from-left')
  protected get revealFromLeft(): boolean {
    return this.animation === 'fade-left';
  }

  @HostBinding('class.reveal-from-right')
  protected get revealFromRight(): boolean {
    return this.animation === 'fade-right';
  }

  @HostBinding('style.transition-delay.ms')
  protected get transitionDelay(): number {
    return this.revealDelay;
  }

  private observer?: IntersectionObserver;
  private revealTimeoutId: number | null = null;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly ngZone: NgZone,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
      this.isVisible = true;
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) {
            return;
          }

          if (entry.isIntersecting) {
            this.scheduleReveal();

            if (this.revealOnce) {
              this.observer?.disconnect();
              this.observer = undefined;
            }

            return;
          }

          if (!this.revealOnce) {
            this.clearRevealTimeout();
            this.ngZone.run(() => {
              this.isVisible = false;
            });
          }
        },
        {
          threshold: this.revealThreshold,
          rootMargin: '0px 0px -8% 0px',
        },
      );

      this.observer.observe(this.elementRef.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.clearRevealTimeout();
  }

  private scheduleReveal(): void {
    this.clearRevealTimeout();

    if (this.revealDelay <= 0) {
      this.ngZone.run(() => {
        this.isVisible = true;
      });
      return;
    }

    this.revealTimeoutId = window.setTimeout(() => {
      this.ngZone.run(() => {
        this.isVisible = true;
      });
      this.revealTimeoutId = null;
    }, this.revealDelay);
  }

  private clearRevealTimeout(): void {
    if (this.revealTimeoutId === null) {
      return;
    }

    window.clearTimeout(this.revealTimeoutId);
    this.revealTimeoutId = null;
  }
}
