import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./features/home/home-section/home-section.component').then((h) => h.HomeSectionComponent) },
  { path: 'home', loadComponent: () => import('./features/home/home-section/home-section.component').then((h) => h.HomeSectionComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then((l) => l.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then((r) => r.RegisterComponent) },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then((c) => c.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password/reset-password.component').then((c) => c.ResetPasswordComponent) },
  { path: 'itineraries/new', loadComponent: () => import('./features/planner/manual-planner/manual-planner.component').then((m) => m.ManualPlannerComponent) },
  { path: 'itineraries/builder', loadComponent: () => import('./features/planner/itinerary-builder/itinerary-builder.component').then((m) => m.ItineraryBuilderComponent) },
  { path: '**', redirectTo: '' }
];
