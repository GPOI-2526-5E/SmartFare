import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

function getLoaderMessage(req: any): string {
  const normalized = req.url.toLowerCase();
  const method = req.method;

  if (normalized.includes('/auth/login')) {
    return 'Verifica credenziali in corso...';
  }

  if (normalized.includes('/auth/register')) {
    return 'Creazione account in corso...';
  }

  if (normalized.includes('/api/itineraries/workspace')) {
    return 'Caricamento destinazione e punti di interesse...';
  }
  
  if (normalized.includes('/api/itineraries/me')) {
    return 'Recupero i tuoi itinerari...';
  }

  if (normalized.includes('/api/itineraries/latest')) {
    return 'Ripristino l\'ultimo itinerario...';
  }

  if (normalized.includes('/api/itineraries') && method === 'POST') {
    return 'Sincronizzazione modifiche in corso...';
  }

  return "Sincronizzazione dati...";
}

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);
  const normalized = req.url.toLowerCase();
  
  // Show loader for important itinerary requests
  const isWorkspaceLoad = normalized.includes('/api/itineraries/workspace');
  const isAuth = normalized.includes('/auth/');
  const isItineraryLatest = normalized.includes('/api/itineraries/latest');
  const isMyItineraries = normalized.includes('/api/itineraries/me');
  
  // Exclude fast/interactive interactions
  const isLocationSearch = normalized.includes('/api/locations');
  const isAiChat = normalized.includes('/api/ai');
  const isContentSearch = normalized.includes('/api/activity') || normalized.includes('/api/accommodation');

  // Show loader ONLY for critical blocking operations
  const shouldShowLoader = (isWorkspaceLoad || isAuth || isItineraryLatest || isMyItineraries) && !isLocationSearch && !isAiChat && !isContentSearch;

  if (!shouldShowLoader) {
    return next(req);
  }

  const message = getLoaderMessage(req);

  loaderService.show(message);

  return next(req).pipe(
    finalize(() => {
      loaderService.hide();
    })
  );
};
