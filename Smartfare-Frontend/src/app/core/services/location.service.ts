import { Injectable } from '@angular/core';
import { Observable, shareReplay, catchError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import Location from '../models/location.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})

export class LocationService {
  private readonly APIENDPOINT = `${environment.apiUrl}/api`;
  private locationsRequest$?: Observable<Location[]>;

  constructor(private http: HttpClient) { };

  getLocations(q?: string): Observable<Location[]> {
    if (q) {
      // Dynamic search from backend
      return this.http.get<Location[]>(`${this.APIENDPOINT}/locations`, {
        params: { q }
      });
    }

    if (!this.locationsRequest$) {
      this.locationsRequest$ = this.http
        .get<Location[]>(this.APIENDPOINT + '/locations')
        .pipe(shareReplay(1));
    }

    return this.locationsRequest$;
  }

  getCarouselLocations(limit = 3): Observable<Location[]> {
    return this.http
      .get<Location[]>(`${this.APIENDPOINT}/locations/carousel`, {
        params: { limit: limit.toString() }
      })
      .pipe(catchError(() => of([])));
  }
}
