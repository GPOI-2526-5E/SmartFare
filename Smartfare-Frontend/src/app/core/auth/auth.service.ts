import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthResponse } from '../models/response.model';
import { HttpClient } from '@angular/common/http';
import { Token } from '@angular/compiler';

@Injectable({
  providedIn: 'root',
})

export class AuthService {
  private readonly TOKEN_KEY = 'authToken';

  private readonly tokenSignal = signal<string | null>(null);

  private AUTH_URL = 'http://localhost:3500/auth';

  constructor(private http: HttpClient) {
    const token = localStorage.getItem(this.TOKEN_KEY);

    if (token && !this.isTokenExpired(token)) {
      this.tokenSignal.set(token);
    } else if (token) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  saveAuth(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.tokenSignal.set(token);
  }

  Logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    this.tokenSignal.set(null);
  }

  IsAuthenticated(): boolean {
    const token = this.tokenSignal();
    return !!token && !this.isTokenExpired(token);
  }

  isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const decoded = JSON.parse(atob(parts[1]));

      if (!decoded.exp) return false;

      const expirationTime = decoded.exp * 1000;
      return Date.now() >= expirationTime;
    } catch (error) {
      return true;
    }
  }

  Login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<any>(this.AUTH_URL + "/login", { email, password });
  }
}

