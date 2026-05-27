import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../services/loader.service';

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

  loaderService.show();

  return next(req).pipe(
    finalize(() => {
      loaderService.hide();
    })
  );
};
