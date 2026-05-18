import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, NgZone, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { ItineraryService } from '../../../core/services/itinerary.service';
import { AiChatService } from '../../../core/services/ai-chat.service';

@Component({
  selector: 'app-ai-prompt-bar',
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-prompt-bar.component.html',
  styleUrl: './ai-prompt-bar.component.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiPromptBarComponent implements OnInit, OnDestroy {

  travelQuery: string = '';
  protected readonly currentPlaceholder = signal('');

  private placeholders: string[] = [
    "Es: Organizza un viaggio on the road in California...",
    "Es: Cerco una vacanza rilassante al mare in Puglia...",
    "Es: Portami a scoprire l'aurora boreale in Islanda..."
  ];

  isGenerating = signal(false);

  private placeholderIndex = 0;
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly ngZone = inject(NgZone);
  private readonly aiChatService = inject(AiChatService);
  private readonly reduceMotion = typeof window !== 'undefined' && (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  );

  constructor(
    private router: Router,
    private alertService: AlertService,
    private itineraryService: ItineraryService
  ) { }

  ngOnInit() {
    this.currentPlaceholder.set(this.placeholders[0] ?? '');

    if (this.reduceMotion) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.typingTimeout = setTimeout(() => this.rotatePlaceholder(), 4200);
    });
  }

  ngOnDestroy() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  private rotatePlaceholder() {
    this.placeholderIndex = (this.placeholderIndex + 1) % this.placeholders.length;
    this.currentPlaceholder.set(this.placeholders[this.placeholderIndex] ?? '');

    this.typingTimeout = setTimeout(() => this.rotatePlaceholder(), 4200);
  }

  onAIGenerate(): void {
    if (!this.travelQuery.trim()) {
      this.alertService.show("Inserisci almeno qualche dettaglio per far lavorare l'IA.");
      return;
    }

    void this.generateItineraryFromPrompt();
  }

  private async generateItineraryFromPrompt(): Promise<void> {
    const prompt = this.travelQuery.trim();
    if (!prompt) return;

    this.isGenerating.set(true);

    try {
      const itinerary = await firstValueFrom(this.aiChatService.generateItinerary(prompt));

      if (!itinerary) {
        throw new Error('Itinerario non disponibile');
      }

      this.itineraryService.setCurrentItinerary(itinerary);
      await this.router.navigate(['/itineraries/builder']);
    } catch (error) {
      console.error('AI prompt generation failed:', error);
      this.alertService.error('In questo momento i servizi di Vojage ai sono in sovraccarico. Riprova tra un istante.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  onManualCreate(): void {
    this.router.navigate(['/itineraries', 'new']);
  }
}
