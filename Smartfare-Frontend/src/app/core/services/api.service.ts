import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AuthResponse } from '../models/response.model';

@Injectable({
    providedIn: 'root',
})
export class ApiService{

  private API_URL = 'http://localhost:3500/api';
  private AUTH_URL = 'http://localhost:3500/auth';

  constructor(private http: HttpClient) { };

  LoginRequest(email: string, password: string): Observable<AuthResponse>{
    return this.http.post<AuthResponse>(this.AUTH_URL + "/login", {email, password});
  }
}
