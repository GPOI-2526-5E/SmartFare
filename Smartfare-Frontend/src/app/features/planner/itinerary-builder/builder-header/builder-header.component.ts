import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
  signal,
  ViewChild,
  ElementRef,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { ItineraryService } from '../../../../core/services/itinerary.service';
import { Router, RouterLink } from '@angular/router';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { AlertService } from '../../../../core/services/alert.service';
import { UIStateService } from '../../../../core/services/ui-state.service';
import { ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { colorFromId } from '../../../interactive-map/utils/map-category.util';

type CategoryPill = {
  key: string;
  label: string;
  iconClass: string;
  color: string;
  type: 'all' | 'accommodation' | 'activity';
  categoryId: number | 'all';
};

@Component({
  selector: 'app-builder-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './builder-header.component.html',
  styleUrl: './builder-header.component.css'
})
export class BuilderHeaderComponent {

  // ── Services ──────────────────────────────────────────────────────────────
  readonly ui = inject(UIStateService);
  private readonly authService = inject(AuthService);
  private readonly itineraryService = inject(ItineraryService);
  private readonly router = inject(Router);
  private readonly alertService = inject(AlertService);
  private readonly socialAuthService = inject(SocialAuthService);

  // ── Workspace input ───────────────────────────────────────────────────────
  private readonly workspaceSignal = signal<ItineraryWorkspace | null>(null);

  @Input()
  set workspace(value: ItineraryWorkspace | null) {
    this.workspaceSignal.set(value);
  }
  get workspace(): ItineraryWorkspace | null {
    return this.workspaceSignal();
  }

  // ── Outputs ───────────────────────────────────────────────────────────────
  @Output() navRequest = new EventEmitter<string>();
  @Output() saveRequest = new EventEmitter<void>();
  @Output() exportRequest = new EventEmitter<'pdf'>();

  // ── Dropdown state ────────────────────────────────────────────────────────
  readonly showVisibleDayDropdown = signal(false);

  // ── Itinerary state ───────────────────────────────────────────────────────
  readonly itinerary = this.itineraryService.itinerary;
  readonly autosaveStatus = this.itineraryService.autosaveStatus;
  readonly canUndo = this.itineraryService.canUndo;
  readonly canRedo = this.itineraryService.canRedo;

  // ── Auth ──────────────────────────────────────────────────────────────────
  readonly isAuthenticated = computed(() => this.authService.IsAuthenticated());
  readonly user = computed(() => this.authService.getUserData());

  // ── Available days ────────────────────────────────────────────────────────
  readonly availableDays = computed(() => {
    const it = this.itinerary();
    if (!it) return [1];

    const usedDays = (it.items || [])
      .map((item) => item.dayNumber || 1)
      .filter((day) => Number.isFinite(day) && day > 0);

    const highestUsedDay = usedDays.length ? Math.max(...usedDays) : 1;
    const progressiveDays = highestUsedDay + 1;
    let totalDaysFromDates = 1;

    if (it.startDate && it.endDate) {
      const start = new Date(it.startDate);
      const end = new Date(it.endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        totalDaysFromDates = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    const totalDays = Math.max(1, totalDaysFromDates, progressiveDays);
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  });

  // ── Category pills ────────────────────────────────────────────────────────
  readonly categoryPills = computed((): CategoryPill[] => {
    const ws = this.workspaceSignal();
    const pills: CategoryPill[] = [
      { key: 'all', label: 'Tutto', iconClass: 'bi-grid-3x3-gap-fill', color: '#0ea5e9', type: 'all', categoryId: 'all' },
      { key: 'hotel', label: 'Hotel', iconClass: 'bi-building', color: '#8b5cf6', type: 'accommodation', categoryId: 'all' }
    ];
    if (!ws) return pills;
    const usedCatIds = new Set(ws.activities.map(a => a.categoryId));
    for (const cat of ws.categories || []) {
      if (usedCatIds.has(cat.id)) {
        pills.push({
          key: `cat-${cat.id}`,
          label: cat.name,
          iconClass: cat.iconUrl || this.catIcon(cat.name),
          color: colorFromId(cat.id),
          type: 'activity',
          categoryId: cat.id
        });
      }
    }
    return pills;
  });

  readonly activePillKey = computed(() => {
    const t = this.ui.selectedType();
    const c = this.ui.selectedCategory();
    if (t === 'all') return 'all';
    if (t === 'accommodation') return 'hotel';
    if (t === 'activity' && c !== 'all') return `cat-${c}`;
    return 'all';
  });

  // ── Color picker ──────────────────────────────────────────────────────────
  readonly visibleDayRoute = computed(() => this.ui.visibleDayRoute());

  readonly visibleDayLabel = computed(() => {
    const route = this.visibleDayRoute();
    return route === 'all' ? 'Tutti i giorni' : `Giorno ${route}`;
  });

  readonly showDayColorPicker = computed(() => this.visibleDayRoute() !== 'all');

  readonly colorPickerDay = computed(() => {
    const route = this.visibleDayRoute();
    return typeof route === 'number' ? route : this.ui.selectedDay();
  });

  // ── Save status ───────────────────────────────────────────────────────────
  get saveStatusIcon(): string {
    const status = this.autosaveStatus();
    if (status === 'saving') return 'bi bi-cloud-upload';
    if (status === 'error') return 'bi bi-cloud-slash';
    return 'bi bi-cloud-check';
  }

  // ── ViewChild ─────────────────────────────────────────────────────────────
  @ViewChild('categoryBar', { static: false }) categoryBarRef?: ElementRef<HTMLElement>;

  // ── Constructor: solo l'effect di reset dei giorni fuori range ────────────
  constructor() {
    // Inizializza i colori dei giorni e reimposta il giorno
    // visibile se supera il massimo disponibile.
    // Legge solo availableDays() — NON legge visibleDayRoute()
    // per evitare side-effect sul segnale che vogliamo osservare.
    effect(() => {
      const days = this.availableDays();
      const lastDay = days[days.length - 1] ?? 1;

      // Inizializza colori
      days.forEach((day) => this.ui.ensureDayColor(day));

      // Reset selectedDay se fuori range
      if (this.ui.selectedDay() > lastDay) {
        this.ui.setSelectedDay(lastDay);
      }
    });
  }

  // ── Day selection ─────────────────────────────────────────────────────────

  /**
   * Unico punto di scrittura per la selezione del giorno visibile.
   * Chiama solo setVisibleDayRoute — il service aggiorna anche selectedDay internamente.
   * Il template legge ui.visibleDayRoute() direttamente, quindi si aggiorna immediatamente.
   */
  selectVisibleDay(day: number | 'all'): void {
    this.ui.setVisibleDayRoute(day);
    this.showVisibleDayDropdown.set(false);
    this.ui.setActiveSurface('map');
  }

  toggleVisibleDayDropdown(event: Event): void {
    event.stopPropagation();
    this.showVisibleDayDropdown.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.showVisibleDayDropdown.set(false);
    }
  }

  // ── Category pill ─────────────────────────────────────────────────────────
  selectPill(pill: CategoryPill): void {
    this.ui.setType(pill.type);
    this.ui.setCategory(pill.categoryId);
  }

  // ── Category bar scroll ───────────────────────────────────────────────────
  scrollCategoryBar(amount: number): void {
    const el = this.categoryBarRef?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }

  // ── Map view ──────────────────────────────────────────────────────────────
  showSelectedMarkers(): void {
    this.ui.setMapView('selected');
    this.ui.setActiveSurface('map');
    this.alertService.info('Vista mappa: solo marker selezionati');
  }

  showAreaMarkers(): void {
    this.ui.setMapView('all');
    this.ui.setActiveSurface('map');
    this.alertService.info('Vista mappa: tutti i punti disponibili');
  }

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  undo(): void { this.itineraryService.undo(); }
  redo(): void { this.itineraryService.redo(); }

  // ── Color change ──────────────────────────────────────────────────────────
  onDayColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.ui.setDayColor(this.colorPickerDay(), input.value);
    this.ui.setActiveSurface('map');
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  onNavRequest(url: string, event: Event): void {
    event.preventDefault();
    this.navRequest.emit(url);
  }

  updateName(newName: string): void {
    const current = this.itinerary();
    if (current) {
      this.itineraryService.setCurrentItinerary({
        ...current,
        name: newName?.trim() || 'Senza titolo'
      });
    }
  }

  saveItinerary(): void {
    if (!this.isAuthenticated()) {
      this.saveRequest.emit();
      return;
    }
    const current = this.itinerary();
    if (current) {
      this.itineraryService.saveToBackend(current).subscribe({
        next: (saved) => {
          if (!saved) return;
          this.alertService.success('Itinerario salvato con successo!');
          if (saved.id) {
            sessionStorage.setItem('last_saved_itinerary_id', saved.id.toString());
            sessionStorage.setItem('last_saved_itinerary_updated_at', saved.updatedAt || '');
          }
          this.itineraryService.clearDraft();
          this.router.navigate(['/home']);
        },
        error: () => this.alertService.error('Errore durante il salvataggio.')
      });
    }
  }

  requestExport(): void {
    this.exportRequest.emit('pdf');
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private catIcon(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('muse') || n.includes('monument') || n.includes('storico')) return 'bi-bank';
    if (n.includes('food') || n.includes('risto') || n.includes('cucina')) return 'bi-cup-hot';
    if (n.includes('night') || n.includes('club')) return 'bi-moon-stars';
    if (n.includes('park') || n.includes('parco') || n.includes('nature')) return 'bi-tree';
    if (n.includes('shop') || n.includes('negozi')) return 'bi-bag';
    if (n.includes('sport') || n.includes('fitness')) return 'bi-trophy';
    if (n.includes('spa') || n.includes('wellness')) return 'bi-flower2';
    if (n.includes('arte') || n.includes('galler')) return 'bi-palette';
    if (n.includes('beach') || n.includes('spiaggia')) return 'bi-water';
    return 'bi-compass';
  }
}
