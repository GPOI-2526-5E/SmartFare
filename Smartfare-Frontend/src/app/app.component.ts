import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AlertComponent } from './features/ui/alert/alert.component';
import { AppLoaderComponent } from './features/ui/loader/loader.component';
import { CookieConsentComponent } from './features/ui/cookie-consent/cookie-consent.component';
import { PrivacyModalComponent } from './features/ui/privacy-modal/privacy-modal.component';
import { TosModalComponent } from './features/ui/tos-modal/tos-modal.component';
import { LoaderService } from './core/services/loader.service';
import { SeoService } from './core/seo/seo.service';
import { I18nService } from './core/i18n/i18n.service';

import { ScriptLoaderService } from './core/services/script-loader.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertComponent, AppLoaderComponent, CookieConsentComponent, PrivacyModalComponent, TosModalComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private readonly loaderService = inject(LoaderService);
  private readonly seoService = inject(SeoService);
  private readonly i18nService = inject(I18nService);
  private readonly scriptLoader = inject(ScriptLoaderService);

  readonly isLoading = this.loaderService.isLoading;
  readonly loaderMessage = this.loaderService.message;

  ngOnInit(): void {
    this.seoService.init();
  }
}
