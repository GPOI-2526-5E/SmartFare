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

  return "Caricamento...";
}

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);
  const normalized = req.url.toLowerCase();

  const skipLoader = normalized.includes('/api/itineraries');

  if (skipLoader) {
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
