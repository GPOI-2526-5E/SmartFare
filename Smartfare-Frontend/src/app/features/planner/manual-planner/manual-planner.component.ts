import {
  Component, OnInit, OnDestroy, AfterViewInit,
  signal, ViewChild, ElementRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { LocationService } from '../../../core/services/location.service';
import { ItineraryService } from '../../../core/services/itinerary.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import Location from '../../../core/models/location.model';

interface CityPoint { name: string; x: number; y: number; pulse: number; pulseSpeed: number; }
interface FlightRoute { from: number; to: number; progress: number; speed: number; opacity: number; tailLen: number; }

@Component({
  selector: 'app-manual-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './manual-planner.component.html',
  styleUrl: './manual-planner.component.css'
})
export class ManualPlannerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapCanvas') private mapCanvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Signals ────────────────────────────────────────────────────────────────
  destination       = signal('');
  checkinDate       = signal('');
  checkoutDate      = signal('');
  selectedLocation  = signal<Location | null>(null);
  filteredLocations = signal<Location[]>([]);
  showSuggestions   = signal(false);
  showResumeChoice  = signal(false);
  private pendingDraft = signal<any>(null);

  // ── RxJS ───────────────────────────────────────────────────────────────────
  private searchSubject = new Subject<string>();
  private destroy$      = new Subject<void>();

  // ── Canvas ─────────────────────────────────────────────────────────────────
  private animFrameId: number | null = null;
  private resizeObs: ResizeObserver | null = null;
  private cities: CityPoint[] = [];
  private routes: FlightRoute[] = [];

  // Major world airports [name, lat, lng]
  private readonly RAW_CITIES: [string, number, number][] = [
    ['New York',      40.7,  -74.0],
    ['London',        51.5,   -0.1],
    ['Paris',         48.9,    2.3],
    ['Rome',          41.9,   12.5],
    ['Dubai',         25.2,   55.3],
    ['Tokyo',         35.7,  139.7],
    ['Singapore',      1.3,  103.8],
    ['Sydney',        -33.9, 151.2],
    ['São Paulo',    -23.5,  -46.6],
    ['Cairo',         30.0,   31.2],
    ['Mumbai',        19.1,   72.9],
    ['Beijing',       39.9,  116.4],
    ['Los Angeles',   34.1, -118.2],
    ['Toronto',       43.7,  -79.4],
    ['Mexico City',   19.4,  -99.1],
    ['Johannesburg', -26.2,   28.0],
    ['Moscow',        55.8,   37.6],
    ['Bangkok',       13.8,  100.5],
    ['Istanbul',      41.0,   28.9],
    ['Amsterdam',     52.4,    4.9],
    ['Hong Kong',     22.3,  114.2],
    ['Frankfurt',     50.1,    8.7],
    ['Chicago',       41.9,  -87.6],
    ['Buenos Aires', -34.6,  -58.4],
    ['Nairobi',       -1.3,   36.8],
  ];

  // Pairs of city indices
  private readonly RAW_ROUTES: [number, number][] = [
    [0,  1], [1,  2], [2,  4], [4,  5], [5,  6],
    [6,  7], [0, 14], [0, 12], [1, 18], [1, 19],
    [4, 10], [4, 11], [10, 5], [3, 16], [8,  0],
    [9, 24], [11, 6], [7,  6], [13,22], [20,17],
    [21, 1], [23, 8], [1, 16], [2, 15], [18, 4],
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private locationService: LocationService,
    private itineraryService: ItineraryService,
    private authService: AuthService,
    private alertService: AlertService,
    private ngZone: NgZone
  ) {
    this.setDefaultDates();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const inDate  = this.route.snapshot.queryParams['in'];
    const outDate = this.route.snapshot.queryParams['out'];
    if (inDate)  this.checkinDate.set(inDate);
    if (outDate) this.checkoutDate.set(outDate);

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => q.length < 2 ? [[]] : this.locationService.getLocations(q)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (locs: any) => {
        this.filteredLocations.set(locs);
        this.showSuggestions.set(locs.length > 0);
      },
      error: (err: any) => console.error('Location search error:', err)
    });

    if (!this.authService.IsAuthenticated()) return;
    const savedId = sessionStorage.getItem('last_saved_itinerary_id');
    const savedAt = sessionStorage.getItem('last_saved_itinerary_updated_at');

    if (this.itineraryService.hasDraft()) {
      this.showResumeChoice.set(true);
    } else {
      this.itineraryService.getLatestFromBackend().pipe(takeUntil(this.destroy$)).subscribe(draft => {
        if (draft) {
          if (savedId && draft.id?.toString() === savedId && draft.updatedAt === savedAt) return;
          this.pendingDraft.set(draft);
          this.showResumeChoice.set(true);
        }
      });
    }
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.setupCanvas();
        const canvas = this.mapCanvasRef?.nativeElement;
        if (canvas) {
          this.resizeObs = new ResizeObserver(() => {
            this.setupCanvas();
          });
          this.resizeObs.observe(canvas.parentElement!);
        }
        this.startAnimation();
      }, 50);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.resizeObs?.disconnect();
  }

  // ── Canvas Setup ───────────────────────────────────────────────────────────
  private setupCanvas(): void {
    const canvas = this.mapCanvasRef?.nativeElement;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    canvas.width  = parent.offsetWidth;
    canvas.height = parent.offsetHeight;

    this.cities = this.RAW_CITIES.map(([name, lat, lng]) => {
      const [x, y] = this.project(lat, lng, canvas.width, canvas.height);
      return { name, x, y, pulse: Math.random() * Math.PI * 2, pulseSpeed: 0.025 + Math.random() * 0.015 };
    });

    this.routes = this.RAW_ROUTES.map(([from, to]) => ({
      from, to,
      progress: -(Math.random() * 0.8),
      speed:     0.0025 + Math.random() * 0.0025,
      opacity:   0.55 + Math.random() * 0.45,
      tailLen:   0.07 + Math.random() * 0.06,
    }));
  }

  // Equirectangular projection
  private project(lat: number, lng: number, w: number, h: number): [number, number] {
    return [((lng + 180) / 360) * w, ((90 - lat) / 180) * h];
  }

  // Quadratic bezier control point (arced upward)
  private ctrl(x1: number, y1: number, x2: number, y2: number): [number, number] {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    return [(x1 + x2) / 2, (y1 + y2) / 2 - dist * 0.28];
  }

  // Point on quadratic bezier
  private bezier(t: number, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number): [number, number] {
    const u = 1 - t;
    return [u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2];
  }

  // ── Animation Loop ─────────────────────────────────────────────────────────
  private startAnimation(): void {
    const canvas = this.mapCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Tick city pulses
      this.cities.forEach(c => c.pulse += c.pulseSpeed);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.drawBackground(ctx, canvas.width, canvas.height);
      this.drawGrid(ctx, canvas.width, canvas.height);
      this.drawRoutes(ctx);
      this.drawCities(ctx);
      this.animFrameId = requestAnimationFrame(draw);
    };

    this.animFrameId = requestAnimationFrame(draw);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Subtle vignette over the map
    const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, h * 0.85);
    vg.addColorStop(0, 'rgba(10,30,80,0.05)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.lineWidth = 0.5;
    // Longitude lines
    for (let lng = -180; lng <= 180; lng += 30) {
      const x = ((lng + 180) / 360) * w;
      ctx.strokeStyle = lng === 0 ? 'rgba(100,170,255,0.12)' : 'rgba(80,120,220,0.055)';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    // Latitude lines
    for (let lat = -90; lat <= 90; lat += 30) {
      const y = ((90 - lat) / 180) * h;
      ctx.strokeStyle = lat === 0 ? 'rgba(100,200,255,0.15)' : 'rgba(80,120,220,0.055)';
      ctx.lineWidth = lat === 0 ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  private drawRoutes(ctx: CanvasRenderingContext2D): void {
    this.routes.forEach(r => {
      r.progress += r.speed;
      if (r.progress > 1.15) r.progress = -(0.1 + Math.random() * 0.3);

      const from = this.cities[r.from];
      const to   = this.cities[r.to];
      if (!from || !to) return;

      const [cx, cy] = this.ctrl(from.x, from.y, to.x, to.y);

      // Faint static arc
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(cx, cy, to.x, to.y);
      ctx.strokeStyle = 'rgba(80,130,255,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const t = Math.max(0, Math.min(1, r.progress));
      if (t <= 0 || t >= 1) return;

      // Glowing tail
      const tailStart = Math.max(0, t - r.tailLen);
      const steps = 28;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const st = tailStart + (t - tailStart) * (i / steps);
        const [px, py] = this.bezier(st, from.x, from.y, cx, cy, to.x, to.y);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      const [gx0, gy0] = this.bezier(tailStart, from.x, from.y, cx, cy, to.x, to.y);
      const [gx1, gy1] = this.bezier(t, from.x, from.y, cx, cy, to.x, to.y);
      const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
      grad.addColorStop(0, 'rgba(100,160,255,0)');
      grad.addColorStop(1, `rgba(160,210,255,${r.opacity})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Plane dot at tip
      const [px, py] = this.bezier(t, from.x, from.y, cx, cy, to.x, to.y);
      // Outer glow
      const glowR = ctx.createRadialGradient(px, py, 0, px, py, 9);
      glowR.addColorStop(0, `rgba(140,200,255,${r.opacity * 0.5})`);
      glowR.addColorStop(1, 'rgba(100,160,255,0)');
      ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fillStyle = glowR; ctx.fill();
      // Core dot
      ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,235,255,${r.opacity})`; ctx.fill();
    });
  }

  private drawCities(ctx: CanvasRenderingContext2D): void {
    this.cities.forEach(c => {
      const pv = (Math.sin(c.pulse) + 1) / 2; // 0..1

      // Pulsing outer ring
      const ringR = 6 + pv * 8;
      const ring = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, ringR);
      ring.addColorStop(0, `rgba(100,180,255,${0.15 + pv * 0.1})`);
      ring.addColorStop(1, 'rgba(100,180,255,0)');
      ctx.beginPath(); ctx.arc(c.x, c.y, ringR, 0, Math.PI * 2);
      ctx.fillStyle = ring; ctx.fill();

      // Solid city dot
      ctx.beginPath(); ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,230,255,${0.75 + pv * 0.25})`; ctx.fill();

      // Tiny bright core
      ctx.beginPath(); ctx.arc(c.x, c.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    });
  }

  // ── Form Logic (unchanged) ─────────────────────────────────────────────────
  private setDefaultDates(): void {
    const today    = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    this.checkinDate.set(today.toISOString().split('T')[0]);
    this.checkoutDate.set(tomorrow.toISOString().split('T')[0]);
  }

  onDestinationInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.destination.set(val);
    this.selectedLocation.set(null);
    this.searchSubject.next(val);
  }

  onCheckinChange(newDate: string): void {
    this.checkinDate.set(newDate);
    if (newDate) {
      const d = new Date(newDate);
      d.setDate(d.getDate() + 1);
      this.checkoutDate.set(d.toISOString().split('T')[0]);
    }
  }

  resumeItinerary(): void {
    const draft = this.itineraryService.itinerary() || this.pendingDraft();
    if (draft) {
      this.itineraryService.setCurrentItinerary(draft, { autosave: false });
      this.router.navigate(['/itineraries', 'builder']);
    }
    this.showResumeChoice.set(false);
  }

  createNewItinerary(): void {
    this.itineraryService.clearDraft();
    this.showResumeChoice.set(false);
    this.destination.set('');
    this.selectedLocation.set(null);
    this.setDefaultDates();
  }

  selectLocation(location: Location): void {
    this.destination.set(`${location.name} (${location.province})`);
    this.selectedLocation.set(location);
    this.showSuggestions.set(false);
    this.filteredLocations.set([]);
  }

  startPlanning(): void {
    const dest     = this.destination();
    const cin      = this.checkinDate();
    const cout     = this.checkoutDate();
    const location = this.selectedLocation();

    if (!dest || !cin || !cout) {
      this.alertService.warning('Per favore, compila tutti i campi richiesti.');
      return;
    }
    if (!location) {
      this.alertService.warning('Seleziona una destinazione valida dalla lista suggerimenti.');
      return;
    }
    if (new Date(cin) >= new Date(cout)) {
      this.alertService.warning('La data di ritorno deve essere successiva alla data di arrivo.');
      return;
    }

    this.itineraryService.setCurrentItinerary({
      name: `Viaggio a ${dest}`,
      startDate: cin,
      endDate: cout,
      locationId: location.id,
      location,
      items: []
    });

    this.router.navigate(['/itineraries', 'builder'], {
      queryParams: { dest, locationId: location.id, in: cin, out: cout }
    });
  }
}
