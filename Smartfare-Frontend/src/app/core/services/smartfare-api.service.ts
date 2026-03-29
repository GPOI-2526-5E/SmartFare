import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Airports } from '../models/flights.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})

export class SmartfareService {
  private readonly APIENDPOINT = 'http://localhost:3500/api';

  constructor(private http: HttpClient) { };

  GetAirports(): Observable<any>{
    return this.http.get<any>(this.APIENDPOINT + '/flights/airports');
  }

  GetLocations(): Observable<any>{
    return this.http.get<any>(this.APIENDPOINT + "/locations");
  }
}
