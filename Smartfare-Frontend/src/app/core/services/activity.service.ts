import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActivityCategory } from '../models/activity.model';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private readonly APIENDPOINT = `${environment.apiUrl}/api/activity`;
  private categories$?: Observable<ActivityCategory[]>;

  constructor(private http: HttpClient) {}

  getCategories(): Observable<ActivityCategory[]> {
    if (!this.categories$) {
      this.categories$ = this.http.get<ActivityCategory[]>(`${this.APIENDPOINT}/categories`).pipe(
        shareReplay(1)
      );
    }
    return this.categories$;
  }
}
