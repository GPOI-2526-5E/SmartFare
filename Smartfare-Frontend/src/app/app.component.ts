import { Component, DestroyRef, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import AOS from 'aos';
import { AlertComponent } from './features/ui/alert/alert.component';
import { AppLoaderComponent } from './features/ui/loader/loader.component';
import { LoaderService } from './core/services/loader.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertComponent, AppLoaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private readonly loaderService = inject(LoaderService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = this.loaderService.isLoading;
  readonly loaderMessage = this.loaderService.message;

  private aosInitialized = false;
  private loaderWasVisible = false;
  private initialAosTimer: number | null = null;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (!this.isLoading() && this.aosInitialized) {
          this.queueAosRefresh();
        }
      });

    effect(() => {
      const loading = this.isLoading();

      if (loading) {
        this.loaderWasVisible = true;
        this.clearInitialAosTimer();
        this.resetAosElements();
        return;
      }

      if (this.loaderWasVisible) {
        this.queueAosRefresh();
        this.loaderWasVisible = false;
        return;
      }

      if (!this.aosInitialized) {
        this.scheduleInitialAosInit();
      }
    });
  }

  private scheduleInitialAosInit(): void {
    if (this.initialAosTimer !== null || this.isLoading()) {
      return;
    }

    this.initialAosTimer = window.setTimeout(() => {
      this.initialAosTimer = null;

      if (!this.isLoading()) {
        this.queueAosRefresh();
      }
    }, 350);
  }

  private clearInitialAosTimer(): void {
    if (this.initialAosTimer === null) {
      return;
    }

    window.clearTimeout(this.initialAosTimer);
    this.initialAosTimer = null;
  }

  private queueAosRefresh(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (!this.aosInitialized) {
          AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: false,
            mirror: false
          });
          this.aosInitialized = true;
          return;
        }

        AOS.refreshHard();
      }, 180);
    });
  }

  private resetAosElements(): void {
    if (typeof document === 'undefined' || !this.aosInitialized) {
      return;
    }

    document.querySelectorAll<HTMLElement>('[data-aos]').forEach((element) => {
      element.classList.remove('aos-animate');
      void element.offsetWidth;
    });
  }
}
