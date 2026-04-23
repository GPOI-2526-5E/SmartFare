import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AlertComponent } from './features/ui/alert/alert.component';
import { AppLoaderComponent } from './features/ui/loader/loader.component';
import { LoaderService } from './core/services/loader.service';
import * as AOS from 'aos';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertComponent, AppLoaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private readonly loaderService = inject(LoaderService);
  private readonly router = inject(Router);

  readonly isLoading = this.loaderService.isLoading;
  readonly loaderMessage = this.loaderService.message;

  isDarkMode = signal<boolean>(true);

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

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkMode.set(savedTheme === 'dark');
    } else {
      this.isDarkMode.set(true);
    }
    this.updateBodyClass();
  }

  toggleTheme() {
    this.isDarkMode.set(!this.isDarkMode());
    localStorage.setItem('theme', this.isDarkMode() ? 'dark' : 'light');
    this.updateBodyClass();
  }

  private updateBodyClass() {
    if (this.isDarkMode()) {
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }
}
