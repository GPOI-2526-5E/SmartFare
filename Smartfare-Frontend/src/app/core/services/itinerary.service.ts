import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Itinerary } from '../models/itinerary.model';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ItineraryService {
  private readonly API_URL = `${environment.apiUrl}/api/itineraries`;

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

    if (options?.autosave === false) return;
    if (!this.authService.IsAuthenticated()) return;

    this.autosaveQueue$.next(data);
  }

  clearDraft() {
    this.itinerarySignal.set(null);
    this.autosaveStatusSignal.set('idle');
  }

  // Load latest from backend
  loadLatestFromBackend(): Observable<Itinerary | null> {
    if (!this.authService.IsAuthenticated()) return of(null);

    return this.http.get<Itinerary>(`${this.API_URL}/latest`).pipe(
      tap(data => {
        if (data) {
          this.setCurrentItinerary(data, { autosave: false });
          this.autosaveStatusSignal.set('saved');
        }
      }),
      catchError(() => of(null))
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
          return;
        }

        this.autosaveStatusSignal.set('error');
      })
    );
  }
}
