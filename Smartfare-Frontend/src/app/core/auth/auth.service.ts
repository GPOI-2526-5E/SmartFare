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

  private AUTH_URL = 'http://localhost:3200/auth';

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

  getUserData(): any {
    if (!this.IsAuthenticated()) return null;

    try {
      const parts = this.tokenSignal()!.split('.');
      if (parts.length !== 3) return null;

      // JWT uses Base64URL which atob doesn't native support for all chars
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      if (pad) {
        if (pad === 1) throw new Error('Invalid base64 string');
        base64 += new Array(5 - pad).join('=');
      }

      const decoded = JSON.parse(atob(base64));
      console.log('Decoded User Data:', decoded); // Debug login data
      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
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

  LoginWithGoogle(idToken: string): Observable<AuthResponse> {
    return this.http.post<any>(this.AUTH_URL + "/google", { idToken });
  }

  Register(data: any): Observable<any> {
    return this.http.post<any>(this.AUTH_URL + "/register", data);
  }
}

