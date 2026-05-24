import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActivityCategory } from '../models/activity.model';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private readonly APIENDPOINT = `${environment.apiUrl}/api/activity`;
  private categories$?: Observable<{ categories: ActivityCategory[]; hasHotels: boolean }>;

  constructor(private http: HttpClient) {}

  getCategories(): Observable<{ categories: ActivityCategory[]; hasHotels: boolean }> {
    if (!this.categories$) {
      this.categories$ = this.http
        .get<{ categories: ActivityCategory[]; hasHotels: boolean }>(`${this.APIENDPOINT}/categories`)
        .pipe(shareReplay(1));
    }
    return this.categories$;
  }

  getPoisInArea(minLat: number, maxLat: number, minLng: number, maxLng: number, limit: number = 1000): Observable<{ activities: any[], accommodations: any[] }> {
    const params = new HttpParams()
      .set('minLat', minLat.toString())
      .set('maxLat', maxLat.toString())
      .set('minLng', minLng.toString())
      .set('maxLng', maxLng.toString())
      .set('limit', limit.toString());
      
    return this.http.get<{ activities: any[], accommodations: any[] }>(`${this.APIENDPOINT}/area`, { params });
  }
}
