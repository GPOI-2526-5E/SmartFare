import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AlertComponent } from './features/ui/alert/alert.component';
import { LoaderHomeComponent } from "./features/ui/loader/loader.component";
import { LoaderService } from './core/services/loader.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertComponent, LoaderHomeComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  loaderService = inject(LoaderService);
  readonly isLoading = this.loaderService.isLoading;
  private readonly router = inject(Router);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        if (typeof window === 'undefined') {
          return;
        }

        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      });
  }
}
