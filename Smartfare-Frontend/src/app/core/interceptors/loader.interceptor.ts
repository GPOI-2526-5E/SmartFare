import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

function getLoaderMessage(url: string): string {
  const normalized = url.toLowerCase();

  if (normalized.includes('/auth/login')) {
    return 'Verifica credenziali in corso...';
  }

  if (normalized.includes('/auth/register')) {
    return 'Creazione account in corso...';
  }

  if (normalized.includes('/api/itineraries/workspace')) {
    return 'Caricamento destinazione e punti di interesse...';
  }

  if (normalized.includes('/api/itineraries/latest')) {
    return 'Recupero ultimo itinerario...';
  }

  return "Caricamento...";
}

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);
  const normalized = req.url.toLowerCase();

  // Show loader for important itinerary requests (Workspace, Latest, etc.)
  // We can skip specifically the autosave POST if it feels too intrusive
  const isWorkspaceLoad = normalized.includes('/api/itineraries/workspace');
  const isAuth = normalized.includes('/auth/');
  const isItineraryLatest = normalized.includes('/api/itineraries/latest');

  // If it's a GET to workspace or a POST/GET for auth, we definitely want the loader.
  // We skip background-style requests like autosave if they are too frequent.
  const shouldShowLoader = isWorkspaceLoad || isAuth || isItineraryLatest;

  if (!shouldShowLoader) {
    return next(req);
  }

  const message = getLoaderMessage(req.url);

  loaderService.show(message);

  return next(req).pipe(
    finalize(() => {
      loaderService.hide();
    })
  );
};
