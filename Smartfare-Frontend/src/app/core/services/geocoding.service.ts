import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly endpoint = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) {}

  search(query: string, limit = 5): Observable<GeocodingResult[]> {
    const params = new HttpParams()
      .set('q', query)
      .set('format', 'jsonv2')
      .set('addressdetails', '1')
      .set('limit', limit.toString())
      .set('countrycodes', 'it');

    return this.http.get<GeocodingResult[]>(this.endpoint, { params });
  }
}