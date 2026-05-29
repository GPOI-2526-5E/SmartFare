import { ApplicationConfig, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GoogleLoginProvider, SOCIAL_AUTH_CONFIG, SocialAuthServiceConfig } from '@abacritt/angularx-social-login';
import { APP_ROUTES } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { contentModerationInterceptor } from './core/interceptors/content-moderation.interceptor';
import { loaderInterceptor } from './core/interceptors/loader.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'it-IT' },
    importProvidersFrom(BrowserAnimationsModule),
    provideRouter(APP_ROUTES),
    provideHttpClient(withInterceptors([authInterceptor, contentModerationInterceptor, loaderInterceptor])),
    {
      provide: SOCIAL_AUTH_CONFIG,
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              '182952184245-6f331qlfbqd19cs64vedd307ipeg9vrl.apps.googleusercontent.com',
              {
                oneTapEnabled: false,
                prompt: 'select_account'
              }
            )
          }
        ],
        onError: (err) => {
          console.error(err);
        }
      } as SocialAuthServiceConfig
    }
  ]
};
