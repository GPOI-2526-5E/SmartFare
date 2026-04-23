import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AlertComponent } from './features/ui/alert/alert.component';
import { AppLoaderComponent } from './features/ui/loader/loader.component';
import { LoaderService } from './core/services/loader.service';
import { ThemeService } from './core/services/theme.service';
import { ThemeToggleComponent } from './features/ui/theme-toggle/theme-toggle.component';
import * as AOS from 'aos';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertComponent, AppLoaderComponent, ThemeToggleComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private readonly loaderService = inject(LoaderService);
  private readonly themeService = inject(ThemeService); // Initialize service
  private readonly router = inject(Router);

  readonly isLoading = this.loaderService.isLoading;
  readonly loaderMessage = this.loaderService.message;

  ngOnInit() {
    AOS.init({ once: true, offset: 50 });

    // Refresh AOS on router navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      setTimeout(() => {
        AOS.refresh();
      }, 100);
    });
  }
}
