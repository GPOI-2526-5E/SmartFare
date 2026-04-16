import { Component, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css',
  standalone: true
})
export class AppLoaderComponent {
  readonly show = input(false);
  readonly message = input('Stiamo preparando la tua esperienza.');
  protected readonly phases = [
    {
      icon: 'bi-airplane-fill',
      label: 'Flight',
      title: 'Decollo rapido',
      detail: 'Agganciamo tratte e disponibilita per partire subito.'
    },
    {
      icon: 'bi-train-front-fill',
      label: 'Rail',
      title: 'Cambio mezzo',
      detail: 'Combiniamo collegamenti smart per un viaggio senza attriti.'
    },
    {
      icon: 'bi-buildings-fill',
      label: 'Stay',
      title: 'Sosta perfetta',
      detail: 'Selezioniamo hotel e soluzioni adatte alla tua tappa.'
    },
    {
      icon: 'bi-map-fill',
      label: 'Map',
      title: 'Rotta finale',
      detail: 'Organizziamo la mappa completa della tua esperienza.'
    }
  ] as const;

  protected readonly activePhaseIndex = signal(0);

  private phaseTimerId: number | null = null;

  constructor() {
    effect(() => {
      if (this.show()) {
        this.startPhaseLoop();
        return;
      }

      this.stopPhaseLoop();
      this.activePhaseIndex.set(0);
    });
  }

  protected isPhaseActive(index: number): boolean {
    return index <= this.activePhaseIndex();
  }

  private startPhaseLoop(): void {
    if (this.phaseTimerId !== null || typeof window === 'undefined') {
      return;
    }

    this.phaseTimerId = window.setInterval(() => {
      this.activePhaseIndex.update((index) => (index + 1) % this.phases.length);
    }, 1350);
  }

  private stopPhaseLoop(): void {
    if (this.phaseTimerId === null || typeof window === 'undefined') {
      return;
    }

    window.clearInterval(this.phaseTimerId);
    this.phaseTimerId = null;
  }
}
