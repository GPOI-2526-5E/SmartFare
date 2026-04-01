import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./features/home/home-section/home-section.component').then((h) => h.HomeSectionComponent) },
  { path: 'home', loadComponent: () => import('./features/home/home-section/home-section.component').then((h) => h.HomeSectionComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then((l) => l.LoginComponent) },
  { path: 'hotel', loadComponent: () => import('./features/booking/hotel-booking/hotel-booking.component').then((h) => h.HotelBookingComponent) },
  { path: '**', redirectTo: '' }
];
