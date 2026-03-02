import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { RegisterComponent } from './components/register/register';

export const APP_ROUTES: Routes = [
  { path: '', component: HomeComponent },
  { path: "register", component: RegisterComponent},
  {path: "home", component: HomeComponent},
  { path: '**', redirectTo: '' }
];
