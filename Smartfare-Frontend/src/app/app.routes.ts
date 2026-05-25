import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const APP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home-section/home-section.component').then((h) => h.HomeSectionComponent),
    data: { seoKey: 'home' }
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home-section/home-section.component').then((h) => h.HomeSectionComponent),
    data: { seoKey: 'home' }
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((l) => l.LoginComponent),
    data: { seoKey: 'login' }
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then((r) => r.RegisterComponent),
    data: { seoKey: 'register' }
  },
  {
    path: 'oauth/callback',
    loadComponent: () => import('./features/auth/oauth-callback/oauth-callback.component').then((c) => c.OAuthCallbackComponent),
    data: { seoKey: 'oauth-callback' }
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then((c) => c.ForgotPasswordComponent),
    data: { seoKey: 'forgot-password' }
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then((c) => c.ResetPasswordComponent),
    data: { seoKey: 'reset-password' }
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email.component').then((c) => c.VerifyEmailComponent),
    data: { seoKey: 'verify-email' }
  },
  {
    path: 'profile/itineraries',
    loadComponent: () => import('./features/profile/itineraries/itineraries.component').then((c) => c.ItinerariesComponent),
    data: { seoKey: 'profile-itineraries' }
  },
  {
    path: 'manual/planner',
    loadComponent: () => import('./features/planner/manual-planner/manual-planner.component').then((m) => m.ManualPlannerComponent),
    data: { seoKey: 'manual-planner' }
  },
  {
    path: 'itineraries',
    loadComponent: () => import('./features/profile/itineraries/itineraries.component').then((c) => c.ItinerariesComponent),
    canActivate: [authGuard],
    data: { seoKey: 'itineraries' }
  },
  {
    path: 'itineraries/new',
    loadComponent: () => import('./features/planner/manual-planner/manual-planner.component').then((m) => m.ManualPlannerComponent),
    data: { seoKey: 'itineraries-new' }
  },
  {
    path: 'itineraries/preview',
    loadComponent: () => import('./features/planner/itinerary-preview/itinerary-preview.component').then((p) => p.ItineraryPreviewComponent),
    data: { seoKey: 'itineraries-preview' }
  },
  {
    path: 'itineraries/builder',
    loadComponent: () => import('./features/planner/itinerary-builder/itinerary-builder.component').then((m) => m.ItineraryBuilderComponent),
    data: { seoKey: 'itineraries-builder' }
  },
  {
    path: 'voyager',
    loadComponent: () => import('./features/voyager-ai/voyager-ai.component').then((v) => v.VoyagerAiComponent),
    canActivate: [authGuard],
    data: { seoKey: 'voyager' }
  },
  {
    path: 'profile/followers',
    loadComponent: () => import('./features/profile/followers/followers.component').then((m) => m.FollowersComponent),
    canActivate: [authGuard],
    data: { seoKey: 'profile-followers' }
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile-view/profile-view.component').then((m) => m.ProfileViewComponent),
    canActivate: [authGuard],
    data: { seoKey: 'profile' }
  },
  {
    path: 'profile/:id',
    loadComponent: () => import('./features/profile/profile-view/profile-view.component').then((m) => m.ProfileViewComponent),
    canActivate: [authGuard],
    data: { seoKey: 'profile-public' }
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/profile/settings/settings.component').then((s) => s.SettingsComponent),
    canActivate: [authGuard],
    data: { seoKey: 'settings' }
  },
  {
    path: 'discover',
    loadComponent: () => import('./features/discover/discover-page/discover-page.component').then((c) => c.DiscoverPageComponent),
    data: { seoKey: 'discover' }
  },
  {
    path: 'interactive-map',
    loadComponent: () => import('./features/interactive-map/interactive-map.component').then((c) => c.InteractiveMapComponent),
    data: { seoKey: 'interactive-map' }
  },
  { path: 'italia-map', redirectTo: 'interactive-map', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
