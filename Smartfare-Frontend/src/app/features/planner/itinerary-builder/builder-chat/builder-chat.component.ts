import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Itinerary, ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { AiChatService } from '../../../../core/services/ai-chat.service';
import { AlertService } from '../../../../core/services/alert.service';
import { BuilderPoi } from '../../../../core/models/builder.types';
import { ItineraryService } from '../../../../core/services/itinerary.service';
import { AiItineraryChatAction, AiItineraryChatResponse, AiChatMessage } from '../../../../core/models/ai-chat.model';
import { AuthService } from '../../../../core/auth/auth.service';

type BuilderChatEntry = {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: AiItineraryChatResponse['suggestions'];
  actions?: AiItineraryChatAction[];
  followUpQuestions?: string[];
  timestamp?: Date;
};

@Component({
  selector: 'app-builder-chat',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './builder-chat.component.html',
  styleUrls: ['./builder-chat.component.css'],
})
export class BuilderChatComponent implements AfterViewChecked {
  @Input() workspace: ItineraryWorkspace | null = null;
  @Input() itinerary: Itinerary | null = null;
  @Output() poiFocused = new EventEmitter<BuilderPoi>();

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLElement>;

  private readonly aiChatService = inject(AiChatService);
  private readonly itineraryService = inject(ItineraryService);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private shouldScrollToBottom = false;

  readonly message = signal('');
  readonly isSending = signal(false);
  readonly entries = signal<BuilderChatEntry[]>([]);

  readonly isAuthenticated = computed(() => this.authService.IsAuthenticated());
  readonly hasCurrentItinerary = computed(() => Boolean(this.itineraryService.itinerary()));
  readonly canCompose = computed(
    () => this.isAuthenticated() && this.hasCurrentItinerary() && !this.isSending()
  );

  readonly userAvatar = computed(() => this.authService.userProfile()?.avatarUrl || null);
  readonly userInitial = computed(() => {
    const profile = this.authService.userProfile();
    const name = profile?.name?.trim()?.[0] || '';
    const surname = profile?.surname?.trim()?.[0] || '';
    return (name + surname).toUpperCase() || 'U';
  });

  ngAfterViewChecked() {
    if (!this.shouldScrollToBottom) return;
    this.scrollToBottom();
    this.shouldScrollToBottom = false;
  }

  async submitMessage(text?: string) {
    if (!this.isAuthenticated()) return;

    const content = (text ?? this.message()).trim();
    const currentItinerary = this.itineraryService.itinerary() || this.itinerary;

    if (!content || this.isSending() || !currentItinerary) {
      return;
    }

    this.message.set('');
    this.entries.update((messages) => [...messages, { role: 'user', content, timestamp: new Date() }]);
    this.isSending.set(true);
    this.shouldScrollToBottom = true;

    const history: AiChatMessage[] = this.entries()
      .slice(-8)
      .map((entry) => ({ role: entry.role, content: entry.content }));

    try {
      const response = await firstValueFrom(this.aiChatService.sendMessage({
        message: content,
        locationId: currentItinerary.locationId || this.workspace?.location?.id || undefined,
        itinerary: currentItinerary,
        conversation: history,
        preferences: {
          style: currentItinerary.description?.slice(0, 500) || undefined,
          interests: this.workspace?.categories?.slice(0, 6).map((category) => category.name) || [],
        },
      }));

      if (!response) {
        throw new Error('Risposta AI non disponibile');
      }

      this.entries.update((messages) => [...messages, {
        role: 'assistant',
        content: response.reply,
        suggestions: response.suggestions,
        actions: response.actions,
        followUpQuestions: response.followUpQuestions,
        timestamp: new Date(),
      }]);
      this.shouldScrollToBottom = true;

      this.applyFocusActions(response.actions);

      if (response.itinerary) {
        const merged = this.mergeItineraryUpdate(currentItinerary, response.itinerary);
        this.itineraryService.setCurrentItinerary(merged, { autosave: true });
        this.alertService.success('Itinerario aggiornato con le modifiche richieste.');
      } else if (!response.followUpQuestions?.length && !response.needsConfirmation) {
        this.alertService.info('Nessuna modifica applicata. Prova a essere più specifico sulla tappa o sul giorno da cambiare.');
      }
    } catch (error) {
      console.error('Builder AI error:', error);
      this.alertService.error('In questo momento i servizi AI sono in sovraccarico. Riprova tra un istante.');
    } finally {
      this.isSending.set(false);
      this.shouldScrollToBottom = true;
    }
  }

  useFollowUp(question: string) {
    void this.submitMessage(question);
  }

  focusPoiSuggestion(poiId: number | null | undefined, poiType: 'activity' | 'accommodation' | null | undefined) {
    if (!poiId || !poiType || !this.workspace) return;

    const poi = poiType === 'accommodation'
      ? this.workspace.accommodations.find((entry) => entry.id === poiId)
      : this.workspace.activities.find((entry) => entry.id === poiId);

    if (!poi) return;

    this.poiFocused.emit({
      key: `${poiType}-${poiId}`,
      type: poiType,
      entityId: poiId,
      title: poi.name,
      subtitle: poiType === 'accommodation' ? poi.street || 'Hotel' : poi.street || 'Attività',
      latitude: poi.latitude,
      longitude: poi.longitude,
      itemTypeCode: poiType === 'accommodation' ? 'ACCOMMODATION' : 'ACTIVITY',
      imageUrl: (poi as { imageUrl?: string }).imageUrl,
      price: (poi as { price?: number }).price,
      rating: (poi as { stars?: number }).stars,
    });
  }

  onEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    event.preventDefault();
    void this.submitMessage();
  }

  goToLogin() {
    const returnUrl = this.authService.sanitizeReturnUrl(this.router.url);
    void this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  goToRegister() {
    const returnUrl = this.authService.sanitizeReturnUrl(this.router.url);
    void this.router.navigate(['/register'], { queryParams: { returnUrl } });
  }

  private scrollToBottom() {
    const element = this.scrollContainer?.nativeElement;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }

  private mergeItineraryUpdate(current: Itinerary, update: Itinerary): Itinerary {
    return {
      ...current,
      ...update,
      id: current.id ?? update.id,
      locationId: current.locationId ?? update.locationId,
      location: current.location ?? update.location,
      items: update.items ?? current.items,
    };
  }

  private applyFocusActions(actions: AiItineraryChatAction[] = []) {
    const focusAction = actions.find((action) => action.type === 'focus_poi');
    if (!focusAction?.payload) return;

    const poiId = Number(
      focusAction.payload['poiId'] ?? focusAction.payload['activityId'] ?? focusAction.payload['accommodationId']
    );
    const poiType = (focusAction.payload['poiType'] ?? focusAction.payload['type']) as
      | 'activity'
      | 'accommodation'
      | undefined;
    if (!poiId || !poiType) return;

    this.focusPoiSuggestion(poiId, poiType);
  }
}
