import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { HomeBookingComponent } from './features/home/home-booking/home-booking.component';

export const APP_ROUTES: Routes = [
  { path: '', component: HomeBookingComponent },
  { path: '**', redirectTo: '' }
];
