import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { HomeSectionComponent } from './features/home/home-section/home-section.component';

export const APP_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./features/home/home-section/home-section.component').then((h) => h.HomeSectionComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then((l) => l.LoginComponent)},
  { path: '**', redirectTo: '' }
];
