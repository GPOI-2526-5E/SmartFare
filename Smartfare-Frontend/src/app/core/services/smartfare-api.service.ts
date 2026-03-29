import { Injectable, signal } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Airports } from '../models/flights.model';
import { HttpClient } from '@angular/common/http';
import Location from '../models/location.model';

@Injectable({
  providedIn: 'root',
})

export class SmartfareService {
  private readonly APIENDPOINT = 'http://localhost:3500/api';
  private airportsRequest$?: Observable<{ data: Airports }>;
  private locationsRequest$?: Observable<{ data: Location[] }>;

  constructor(private http: HttpClient) { };

  GetAirports(): Observable<{ data: Airports }> {
    if (!this.airportsRequest$) {
      this.airportsRequest$ = this.http
        .get<{ data: Airports }>(this.APIENDPOINT + '/flights/airports')
        .pipe(shareReplay(1));
    }

    return this.airportsRequest$;
  }

  GetLocations(): Observable<{ data: Location[] }> {
    if (!this.locationsRequest$) {
      this.locationsRequest$ = this.http
        .get<{ data: Location[] }>(this.APIENDPOINT + '/locations')
        .pipe(shareReplay(1));
    }

    return this.locationsRequest$;
  }
}
