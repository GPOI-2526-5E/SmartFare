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
  private airportsRequest$?: Observable<Airports[]>;
  private locationsRequest$?: Observable<Location[]>;

  constructor(private http: HttpClient) { };

  GetAirports(): Observable<Airports[]> {
    if (!this.airportsRequest$)
      this.airportsRequest$ = this.http.get<Airports[]>(this.APIENDPOINT + '/flights/airports');
    return this.airportsRequest$;
  }

  GetLocations(): Observable<Location[]> {
    if (!this.locationsRequest$)
      this.locationsRequest$ = this.http.get<Location[]>(this.APIENDPOINT + '/locations')

    return this.locationsRequest$;
  }
}
