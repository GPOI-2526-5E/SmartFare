import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { SearchResults } from './components/search-results/search-results';

export const APP_ROUTES: Routes = [
  { path: '', component: HomeComponent },
  { path: 'search', component: SearchResults },
  { path: '**', redirectTo: '' }
];
