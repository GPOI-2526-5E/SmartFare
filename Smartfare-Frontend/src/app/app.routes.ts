import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { HomeBookingComponent } from './features/home/home-booking/home-booking.component';

export const APP_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./features/home/home-booking/home-booking.component').then((h) => h.HomeBookingComponent ) },
  { path: '**', redirectTo: '' }
];
