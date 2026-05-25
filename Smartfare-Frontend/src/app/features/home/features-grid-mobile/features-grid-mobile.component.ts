import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface CapabilityStage {
  id: string;
  eyebrow: string;
  headline: string;
  description: string;
  bullets: string[];
  route: string;
  cta: string;
  primaryImage: string;
  primaryUrl: string;
  secondaryImage: string;
  secondaryLabel: string;
  stackWord: string;
}

@Component({
  selector: 'app-features-grid-mobile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './features-grid-mobile.component.html',
  styleUrl: './features-grid-mobile.component.css',
})
export class FeaturesGridMobileComponent {
  protected readonly stages = signal<CapabilityStage[]>([
    {
      id: 'planner',
      eyebrow: 'Planner interattivo',
      headline: 'Costruisci il viaggio mentre la mappa reagisce in tempo reale.',
      description:
        'SmartFare deve sembrare uno strumento vivo: trascini tappe, cambi ordine, vedi la rotta e capisci subito come si sta formando il viaggio.',
      bullets: [
        'Mappe leggibili anche con piu tappe',
        'Bozza pronta gia durante la costruzione',
        'Transizione naturale da idea a piano reale',
      ],
      route: '/itineraries/new',
      cta: 'Apri il planner',
      primaryImage: 'assets/preview.png',
      primaryUrl: 'smartfare.nicolas-dominici.it/itineraries/new',
      secondaryImage: 'assets/preview2.png',
      secondaryLabel: 'Route building',
      stackWord: 'Planner',
    },
    {
      id: 'saved-trips',
      eyebrow: 'Libreria itinerari',
      headline: 'Riapri i tuoi viaggi come una raccolta ordinata e visuale.',
      description:
        'La seconda scena deve mostrare che SmartFare non finisce nella creazione: conserva, organizza e rende riapribili i viaggi migliori senza confusione.',
      bullets: [
        'Archivio leggibile dei viaggi salvati',
        'Anteprime che fanno capire subito dove entrare',
        'Piacevole da scorrere, non solo utile da usare',
      ],
      route: '/profile/itineraries',
      cta: 'Guarda la raccolta',
      primaryImage: 'assets/preview2.png',
      primaryUrl: 'smartfare.nicolas-dominici.it/profile/itineraries',
      secondaryImage: 'assets/preview.png',
      secondaryLabel: 'Saved trips',
      stackWord: 'Itineraries',
    },
    {
      id: 'ai',
      eyebrow: 'AI planner',
      headline: 'Parla in modo naturale e trasforma il prompt in un itinerario concreto.',
      description:
        'Qui deve arrivare la sensazione di intelligenza assistita: l AI aiuta davvero, ma il risultato resta chiaro, modificabile e pronto da portare nel planner.',
      bullets: [
        'Prompt semplici per road trip, weekend o city break',
        'Risposte che diventano una base di lavoro vera',
        'Dal dialogo alla rotta senza salto di contesto',
      ],
      route: '/voyager',
      cta: 'Parla con l AI',
      primaryImage: 'assets/preview3.png',
      primaryUrl: 'smartfare.nicolas-dominici.it/voyager',
      secondaryImage: 'assets/preview.png',
      secondaryLabel: 'AI planning',
      stackWord: 'AI',
    },
  ]);
}
