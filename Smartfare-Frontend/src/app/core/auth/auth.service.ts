import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../services/api.service';

@Injectable({
  providedIn: 'root',
})

export class AuthService {
  private readonly TOKEN_KEY = 'authToken';

  private readonly token = signal<string | null>(null);

  constructor(private apiService: ApiService) {
    const token = localStorage.getItem(this.TOKEN_KEY);

    if (token && !this.isTokenExpired(token)) {
      this.token.set(token);
    } else if (token) {
      localStorage.removeItem(this.TOKEN_KEY);
    }

  };

  async Login(email: string, password: string) {
    try {
      const data = await firstValueFrom(this.apiService.LoginRequest(email, password));

      if (data.token) {
        this.SaveAuth(data.token);
      }

      return data;
    } catch (error: any) {
      console.error("Login error:", error);

      const serverMessage = error?.error?.message || error?.error?.error;
      const errorMessage = serverMessage || ('Errore durante il login: ' + (error?.message || 'Errore sconosciuto'));

      return {
        success: false,
        message: errorMessage
      };
    }
  };

  async Register(email: string, password: string) {
    try {
      const data = await firstValueFrom(this.apiService.RegisterRequest(email, password));

      return data;

    } catch (error: any) {
      console.error("Register error:", error);

      const serverMessage = error?.error?.message || error?.error?.error;
      const errorMessage = serverMessage || ('Errore durante la registrazione: ' + (error?.message || 'Errore sconosciuto'));

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  SaveAuth(token: string) {
    this.token.set(token);
    localStorage.setItem(this.TOKEN_KEY, token);
  };

  getToken(): string | null {
    const token = this.token();

    if (token && this.isTokenExpired(token)) {
      this.logout();
      return null;
    }

    return token;
  };

  isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const decoded = JSON.parse(atob(parts[1]));

      if (!decoded.exp)
        return false;
      const expirationTime = decoded.exp * 1000;
      return Date.now() >= expirationTime;
    } catch (error) {
      return true;
    }
  };

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.token.set(null);
  };
}

