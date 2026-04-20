import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Airports } from '../models/flights.model';
import { HttpClient } from '@angular/common/http';
import Location from '../models/location.model';
import { HotelSearchCriteria } from '../models/hotel-search.model';
import { HotelSearchApiResponse } from '../models/hotel-booking.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})

export class SmartfareService {
  private readonly APIENDPOINT = `${environment.apiUrl}/api`;
  private airportsRequest$?: Observable<Airports[]>;
  private locationsRequest$?: Observable<Location[]>;

  constructor(private http: HttpClient) { };

  getAirports(): Observable<Airports[]> {
    if (!this.airportsRequest$) {
      this.airportsRequest$ = this.http
        .get<Airports[]>(this.APIENDPOINT + '/flights/airports')
        .pipe(shareReplay(1));
    }

    return this.airportsRequest$;
  }

  getLocations(): Observable<Location[]> {
    if (!this.locationsRequest$) {
      this.locationsRequest$ = this.http
        .get<Location[]>(this.APIENDPOINT + '/locations')
        .pipe(shareReplay(1));
    }

    return this.locationsRequest$;
  }

  searchHotels(criteria: HotelSearchCriteria, page = 1, limit = 30): Observable<HotelSearchApiResponse> {
    return this.http.post<HotelSearchApiResponse>(this.APIENDPOINT + '/hotels/search', {
      ...criteria,
      page,
      limit,
    });
  }
}
