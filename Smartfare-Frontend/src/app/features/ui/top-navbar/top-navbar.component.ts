import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupportedLanguage } from '../../../core/i18n/translations';

@Component({
  selector: 'app-top-navbar',
  imports: [TranslatePipe],
  templateUrl: './top-navbar.component.html',
  styleUrl: './top-navbar.component.css',
})
export class TopNavbarComponent {
  readonly i18n = inject(I18nService);
  readonly languages = this.i18n.languages;
  readonly selectedLanguage = this.i18n.language;

  changeLanguage(language: SupportedLanguage): void {
    this.i18n.setLanguage(language);
  }
}
