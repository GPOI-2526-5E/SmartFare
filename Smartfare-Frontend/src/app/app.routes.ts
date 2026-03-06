import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home/home.component';

export const APP_ROUTES: Routes = [
  { path: '', component: HomeComponent },
  { path: "home", component: HomeComponent },
  { path: '**', redirectTo: '' }
];
