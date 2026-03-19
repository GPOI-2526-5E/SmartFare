import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';
import { LOADER_MESSAGE } from './loader-context.token';

function getLoaderMessage(url: string): string {
  const normalized = url.toLowerCase();

  if (normalized.includes('/auth/login')) {
    return 'Accesso in corso...';
  }

  if (normalized.includes('/auth/register')) {
    return 'Creazione account in corso...';
  }

  if (normalized.includes('/search')) {
    return 'Sto cercando le migliori offerte...';
  }

  return 'Sto preparando il tuo itinerario...';
}

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);
  const contextualMessage = req.context.get(LOADER_MESSAGE);
  const message = contextualMessage ?? getLoaderMessage(req.url);

  loaderService.show(message);

  return next(req).pipe(
    finalize(() => {
      loaderService.hide();
    })
  );
};
