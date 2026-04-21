import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import Location from '../models/location.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})

export class SmartfareService {
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

}
