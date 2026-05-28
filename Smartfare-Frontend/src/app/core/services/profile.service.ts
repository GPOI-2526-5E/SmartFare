import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile, UserPreference, UserProfileFull, MyFollowersResponse, FollowMutationResponse } from '../models/user-profile.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly API_URL = `${environment.apiUrl}/api/profile`;

  constructor(private http: HttpClient) {}

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error;
      if (payload && typeof payload === 'object') {
        const details = (payload as any).details;
        const message = (payload as any).error || (payload as any).message || (details && details.reason);
        if (message) return String(message);
      }
      if (typeof payload === 'string' && payload.trim()) return payload;
    }
    return 'Impossibile salvare i dati. Riprova più tardi.';
  }

  getMyProfile(): Observable<UserProfileFull | null> {
    return this.http.get<UserProfileFull>(`${this.API_URL}/me`).pipe(
      catchError(() => of(null))
    );
  }

  getMyFollowers(limit = 50, offset = 0): Observable<MyFollowersResponse | null> {
    return this.http.get<MyFollowersResponse>(`${this.API_URL}/me/followers`, {
      params: { limit: limit.toString(), offset: offset.toString() }
    }).pipe(
      catchError(() => of(null))
    );
  }

  getProfileById(id: number): Observable<UserProfileFull | null> {
    return this.http.get<UserProfileFull>(`${this.API_URL}/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  searchUsers(q: string, limit: number = 10): Observable<UserProfileFull[]> {
    return this.http.get<UserProfileFull[]>(`${this.API_URL}/search`, {
      params: { q, limit: limit.toString() }
    }).pipe(
      catchError(() => of([]))
    );
  }

  getTopCreators(limit: number = 10): Observable<UserProfileFull[]> {
    return this.http.get<UserProfileFull[]>(`${this.API_URL}/top-creators`, {
      params: { limit: limit.toString() }
    }).pipe(
      catchError(() => of([]))
    );
  }

  getFeaturedExplorers(limit: number = 4): Observable<UserProfileFull[]> {
    return this.http.get<UserProfileFull[]>(`${this.API_URL}/featured-explorers`, {
      params: { limit: limit.toString() }
    }).pipe(
      catchError(() => of([]))
    );
  }

  getRandomLocationImage(): Observable<{ imageUrl: string } | null> {
    return this.http.get<{ imageUrl: string }>(`${environment.apiUrl}/api/locations/random-image`).pipe(
      catchError(() => of(null))
    );
  }

  updateProfile(data: Partial<UserProfile>): Observable<{ success: boolean; profile?: UserProfile; message?: string } | null> {
    return this.http.patch<{ success: boolean; profile: UserProfile }>(`${this.API_URL}/me`, data).pipe(
      catchError((err) => of({ success: false, profile: null as any, message: this.extractErrorMessage(err) } as any))
    );
  }

  updatePreferences(data: Partial<UserPreference>): Observable<{ success: boolean; preference?: UserPreference; message?: string } | null> {
    return this.http.patch<{ success: boolean; preference: UserPreference }>(`${this.API_URL}/preferences`, data).pipe(
      catchError((err) => of({ success: false, preference: null as any, message: this.extractErrorMessage(err) } as any))
    );
  }

  sendPasswordChangeCode(): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.API_URL}/password/send-code`, {}).pipe(
      catchError((err) =>
        of({
          success: false,
          message:
            err?.error?.error ||
            err?.error?.message ||
            (typeof err?.error === 'string' ? err.error : null) ||
            'Impossibile inviare il codice. Riprova tra poco.',
        })
      )
    );
  }

  resetPasswordWithCode(code: string, newPassword: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.API_URL}/password/reset`, { code, newPassword }).pipe(
      catchError((err) =>
        of({
          success: false,
          message:
            err?.error?.error ||
            err?.error?.message ||
            (typeof err?.error === 'string' ? err.error : null) ||
            'Codice non valido o scaduto.',
        })
      )
    );
  }

  uploadAvatar(file: File): Observable<{ success: boolean; url: string } | null> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ success: boolean; url: string }>(`${this.API_URL}/upload/avatar`, formData).pipe(
      catchError(() => of(null))
    );
  }

  uploadBackground(file: File): Observable<{ success: boolean; url: string } | null> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ success: boolean; url: string }>(`${this.API_URL}/upload/background`, formData).pipe(
      catchError(() => of(null))
    );
  }

  deleteAccount(): Observable<{ success: boolean; message: string } | null> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/account`).pipe(
      catchError(() => of(null))
    );
  }

  // ─── Follow System ───────────────────────────────────
  private readonly FOLLOW_API_URL = `${environment.apiUrl}/api/follow`;

  followUser(userId: number): Observable<FollowMutationResponse | null> {
    return this.http.post<FollowMutationResponse>(`${this.FOLLOW_API_URL}/${userId}`, {}).pipe(
      catchError(() => of(null))
    );
  }

  unfollowUser(userId: number): Observable<FollowMutationResponse | null> {
    return this.http.delete<FollowMutationResponse>(`${this.FOLLOW_API_URL}/${userId}`).pipe(
      catchError(() => of(null))
    );
  }

  getFollowStatus(userId: number): Observable<{ isFollowing: boolean } | null> {
    return this.http.get<{ isFollowing: boolean }>(`${this.FOLLOW_API_URL}/status/${userId}`).pipe(
      catchError(() => of(null))
    );
  }
}
