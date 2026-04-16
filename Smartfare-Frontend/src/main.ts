import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { APP_ROUTES } from './app/app.routes';
import { loaderInterceptor } from './app/core/interceptors/loader.interceptor';
import { SocialAuthServiceConfig, GoogleLoginProvider } from '@abacritt/angularx-social-login';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(APP_ROUTES),
    provideHttpClient(withInterceptors([loaderInterceptor])),
    {
      provide: 'SocialAuthServiceConfig',
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
      } as SocialAuthServiceConfig,
    }
  ]
}).catch((err: unknown) => console.error(err));
