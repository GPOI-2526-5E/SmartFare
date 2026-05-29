import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

registerLocaleData(localeIt);

bootstrapApplication(AppComponent, appConfig).catch((err: unknown) => console.error(err));
