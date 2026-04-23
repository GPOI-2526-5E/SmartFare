import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Accommodation } from '../models/accommodation.model';

@Injectable({
    providedIn: 'root',
})

export class HotelService {
    private readonly APIENDPOINT = `${environment.apiUrl}/api/accommodation`;

    constructor(private http: HttpClient) { }

    getAccommodations(locationId: number): Observable<Accommodation[]> {
        return this.http.get<Accommodation[]>(`${this.APIENDPOINT}`, {
            params: { locationId: locationId.toString() }
        });
    }
}
