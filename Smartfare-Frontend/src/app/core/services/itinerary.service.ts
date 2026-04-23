import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Itinerary, ItineraryWorkspace } from '../models/itinerary.model';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ItineraryService {
  private readonly API_URL = `${environment.apiUrl}/api/itineraries`;
  private readonly STORAGE_KEY = 'sf_itinerary_draft';

  // State using Signals
  private itinerarySignal = signal<Itinerary | null>(null);
  readonly itinerary = this.itinerarySignal.asReadonly();
  private autosaveStatusSignal = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly autosaveStatus = this.autosaveStatusSignal.asReadonly();
  private autosaveQueue$ = new Subject<Itinerary>();

  // Computed boolean helper
  readonly hasDraft = computed(() => !!this.itinerarySignal());

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.setupAutosavePipeline();
  }

  private setupAutosavePipeline() {
    this.autosaveQueue$
      .pipe(
        debounceTime(700),
        switchMap((draft) => {
          this.autosaveStatusSignal.set('saving');
          return this.saveDraftRequest(draft);
        })
      )
      .subscribe((saved) => {
        if (saved) {
          // Keep latest backend shape (id, timestamps)
          this.itinerarySignal.set(saved);
          this.autosaveStatusSignal.set('saved');
          return;
        }

        this.autosaveStatusSignal.set('error');
      });
  }

  setCurrentItinerary(data: Itinerary, options?: { autosave?: boolean }) {
    this.itinerarySignal.set(data);

    // Persistence for guests
    if (!this.authService.IsAuthenticated()) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return;
    }

    if (options?.autosave === false) return;
    this.autosaveQueue$.next(data);
  }

  loadFromStorage(): boolean {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.itinerarySignal.set(parsed);
        return true;
      } catch (e) {
        console.error('Failed to parse itinerary from storage', e);
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }
    return false;
  }

  clearStorageDraft() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  clearDraft() {
    this.itinerarySignal.set(null);
    this.autosaveStatusSignal.set('idle');
    this.clearStorageDraft();
  }

  // Load latest from backend (as an Observable, without affecting current state automatically)
  getLatestFromBackend(): Observable<Itinerary | null> {
    if (!this.authService.IsAuthenticated()) return of(null);
    return this.http.get<Itinerary>(`${this.API_URL}/latest`).pipe(
      catchError(() => of(null))
    );
  }

  getWorkspace(locationId: number): Observable<ItineraryWorkspace | null> {
    return this.http
      .get<ItineraryWorkspace>(`${this.API_URL}/workspace`, {
        params: { locationId: locationId.toString() }
      })
      .pipe(catchError(() => of(null)));
  }

  // Maintains current behavior for other callers if any, but prefers explicit set
  loadLatestFromBackend(): Observable<Itinerary | null> {
    return this.getLatestFromBackend().pipe(
      tap(data => {
        if (data) {
          this.setCurrentItinerary(data, { autosave: false });
          this.autosaveStatusSignal.set('saved');
        }
      })
    );
  }

  private saveDraftRequest(data: Itinerary): Observable<Itinerary | null> {
    if (!this.authService.IsAuthenticated()) return of(null);

    return this.http.post<Itinerary>(this.API_URL, data).pipe(
      catchError(err => {
        console.error('Error saving itinerary to backend', err);
        return of(null);
      })
    );
  }

  // Manual save (explicit action/navigation)
  saveToBackend(data: Itinerary): Observable<Itinerary | null> {
    this.autosaveStatusSignal.set('saving');
    return this.saveDraftRequest(data).pipe(
      tap((saved) => {
        if (saved) {
          this.setCurrentItinerary(saved, { autosave: false });
          this.autosaveStatusSignal.set('saved');
          this.clearStorageDraft(); // Once saved to backend, we can clear the local copy
          return;
        }

        this.autosaveStatusSignal.set('error');
      })
    );
  }
}
