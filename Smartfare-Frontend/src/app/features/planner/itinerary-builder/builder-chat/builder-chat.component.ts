import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Itinerary, ItineraryItem, ItineraryWorkspace } from '../../../../core/models/itinerary.model';
import { AiChatEntry, AiItineraryChatAction } from '../../../../core/models/ai-chat.model';
import { AiChatService } from '../../../../core/services/ai-chat.service';
import { ItineraryService } from '../../../../core/services/itinerary.service';
import { AlertService } from '../../../../core/services/alert.service';

@Component({
  selector: 'app-builder-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './builder-chat.component.html',
  styleUrl: './builder-chat.component.css'
})
export class BuilderChatComponent implements OnChanges {
  @Input() workspace: ItineraryWorkspace | null = null;
  @Input() itinerary: Itinerary | null = null;

  private readonly chatService = inject(AiChatService);
  private readonly itineraryService = inject(ItineraryService);
  private readonly alertService = inject(AlertService);

  draftMessage = '';
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly messages = signal<AiChatEntry[]>([]);

  readonly starterPrompts = [
    'Cosa dovrei fare in questo posto?',
    'Suggeriscimi attività per la sera',
    'Ottimizza il mio itinerario per essere più rilassante'
  ];

  get hasContext(): boolean {
    return !!this.workspace?.location?.id;
  }

  get canSend(): boolean {
    return this.hasContext && !this.loading() && this.draftMessage.trim().length > 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['workspace'] || changes['itinerary']) {
      this.bootstrapConversation();
    }
  }

  private bootstrapConversation(): void {
    if (!this.hasContext || this.messages().length > 0) {
      return;
    }

    this.messages.set([
      {
        id: this.createId(),
        role: 'assistant',
        content: `Dimmi cosa vuoi fare a ${this.workspace?.location?.name || 'questa destinazione'} e ti aiuto a costruire la giornata.`
      }
    ]);
  }

  sendQuickPrompt(prompt: string): void {
    this.draftMessage = prompt;
    this.sendMessage();
  }

  handleEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;

    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();
    this.sendMessage();
  }

  sendMessage(): void {
    if (!this.canSend) {
      if (!this.hasContext) {
        this.errorMessage.set('Seleziona una destinazione prima di avviare la chat.');
      }
      return;
    }

    const message = this.draftMessage.trim();
    this.draftMessage = '';
    this.errorMessage.set('');

    const userEntry: AiChatEntry = {
      id: this.createId(),
      role: 'user',
      content: message
    };

    this.messages.update((entries) => [...entries, userEntry]);
    this.loading.set(true);

    const conversation = this.messages()
      .filter((entry) => entry.role !== 'assistant' || entry.content !== 'Sto pensando alla tua richiesta...')
      .slice(-8)
      .map((entry) => ({ role: entry.role, content: entry.content }));

    this.chatService.sendMessage({
      message,
      locationId: this.workspace?.location?.id,
      itinerary: this.itinerary,
      conversation
    }).subscribe({
      next: (response) => {
        this.loading.set(false);

        if (!response) {
          this.errorMessage.set('Non sono riuscito a contattare l\'assistente.');
          this.alertService.error('Errore nella chat IA.');
          return;
        }

        const assistantEntry: AiChatEntry = {
          id: this.createId(),
          role: 'assistant',
          content: response.reply,
          suggestions: response.suggestions,
          actions: response.actions,
          followUpQuestions: response.followUpQuestions,
          needsConfirmation: response.needsConfirmation
        };

        this.messages.update((entries) => [...entries, assistantEntry]);
        this.applyAiActions(response.actions);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Errore di rete durante la richiesta IA.');
      }
    });
  }

  private createId(): string {
    return Math.random().toString(36).slice(2, 11);
  }

  private applyAiActions(actions: AiItineraryChatAction[]): void {
    if (!actions.length) {
      return;
    }

    const current = this.itineraryService.itinerary();
    if (!current) {
      return;
    }

    let nextItinerary: Itinerary = {
      ...current,
      items: [...(current.items || [])].map((item) => ({ ...item }))
    };
    let changed = false;

    for (const action of actions) {
      switch (action.type) {
        case 'add_item': {
          const added = this.addItemFromAction(nextItinerary, action.payload);
          if (added) {
            nextItinerary = added;
            changed = true;
          }
          break;
        }
        case 'remove_item': {
          const removed = this.removeItemFromAction(nextItinerary, action.payload);
          if (removed) {
            nextItinerary = removed;
            changed = true;
          }
          break;
        }
        case 'update_item': {
          const updated = this.updateItemFromAction(nextItinerary, action.payload);
          if (updated) {
            nextItinerary = updated;
            changed = true;
          }
          break;
        }
        case 'reorder_items': {
          const reordered = this.reorderItemsFromAction(nextItinerary, action.payload);
          if (reordered) {
            nextItinerary = reordered;
            changed = true;
          }
          break;
        }
        default:
          break;
      }
    }

    if (!changed) {
      return;
    }

    this.itineraryService.setCurrentItinerary(nextItinerary);
    this.alertService.success('Itinerario aggiornato con i suggerimenti dell\'IA.');
  }

  private addItemFromAction(itinerary: Itinerary, payload: Record<string, unknown> | undefined): Itinerary | null {
    const resolved = this.resolvePoiFromPayload(payload);
    if (!resolved) {
      return null;
    }

    const items = [...(itinerary.items || [])];
    const alreadyExists = items.some((item) => this.isSamePoiItem(item, resolved.itemTypeCode, resolved.entityId));
    if (alreadyExists) {
      return null;
    }

    const newItem: ItineraryItem = {
      dayNumber: this.resolveNumber(payload?.['dayNumber'], this.itineraryService.itinerary()?.items?.length ? 1 : 1),
      orderInt: this.resolveNumber(payload?.['orderInt'], items.reduce((acc, item) => Math.max(acc, item.orderInt || 0), 0) + 1),
      itemTypeCode: resolved.itemTypeCode,
      activityId: resolved.activityId ?? undefined,
      accommodationId: resolved.accommodationId ?? undefined,
      note: this.resolveString(payload?.['note']) || undefined,
      plannedStartAt: this.resolveNullableString(payload?.['plannedStartAt']),
      plannedEndAt: this.resolveNullableString(payload?.['plannedEndAt']),
      groupName: this.resolveNullableString(payload?.['groupName'])
    };

    return { ...itinerary, items: [...items, newItem] };
  }

  private removeItemFromAction(itinerary: Itinerary, payload: Record<string, unknown> | undefined): Itinerary | null {
    const items = itinerary.items || [];
    if (!items.length) {
      return null;
    }

    const match = this.findItemIndex(items, payload);
    if (match === -1) {
      return null;
    }

    const nextItems = items.filter((_, index) => index !== match);
    return { ...itinerary, items: nextItems };
  }

  private updateItemFromAction(itinerary: Itinerary, payload: Record<string, unknown> | undefined): Itinerary | null {
    const items = itinerary.items || [];
    if (!items.length) {
      return null;
    }

    const match = this.findItemIndex(items, payload);
    if (match === -1) {
      return null;
    }

    const currentItem = items[match];
    const updatedItem: ItineraryItem = {
      ...currentItem,
      dayNumber: this.resolveNumber(payload?.['dayNumber'], currentItem.dayNumber),
      orderInt: this.resolveNumber(payload?.['orderInt'], currentItem.orderInt),
      note: payload && Object.prototype.hasOwnProperty.call(payload, 'note') ? (this.resolveString(payload['note']) || undefined) : currentItem.note,
      plannedStartAt: payload && Object.prototype.hasOwnProperty.call(payload, 'plannedStartAt') ? this.resolveNullableString(payload['plannedStartAt']) : currentItem.plannedStartAt,
      plannedEndAt: payload && Object.prototype.hasOwnProperty.call(payload, 'plannedEndAt') ? this.resolveNullableString(payload['plannedEndAt']) : currentItem.plannedEndAt,
      groupName: payload && Object.prototype.hasOwnProperty.call(payload, 'groupName') ? this.resolveNullableString(payload['groupName']) : currentItem.groupName,
      groupStartAt: payload && Object.prototype.hasOwnProperty.call(payload, 'groupStartAt') ? this.resolveNullableString(payload['groupStartAt']) : currentItem.groupStartAt,
      groupEndAt: payload && Object.prototype.hasOwnProperty.call(payload, 'groupEndAt') ? this.resolveNullableString(payload['groupEndAt']) : currentItem.groupEndAt,
    };

    const nextItems = [...items];
    nextItems[match] = updatedItem;
    return { ...itinerary, items: nextItems };
  }

  private reorderItemsFromAction(itinerary: Itinerary, payload: Record<string, unknown> | undefined): Itinerary | null {
    const items = [...(itinerary.items || [])];
    const requestedOrder = Array.isArray(payload?.['items']) ? payload?.['items'] as Record<string, unknown>[] : [];

    if (!requestedOrder.length) {
      return null;
    }

    const indexByKey = new Map<string, ItineraryItem>();
    for (const item of items) {
      const key = this.getItemKey(item);
      indexByKey.set(key, item);
    }

    let changed = false;
    const nextItems: ItineraryItem[] = [];

    requestedOrder.forEach((entry, position) => {
      const key = this.getActionKey(entry);
      if (!key) {
        return;
      }

      const item = indexByKey.get(key);
      if (!item) {
        return;
      }

      changed = true;
      nextItems.push({
        ...item,
        dayNumber: this.resolveNumber(entry['dayNumber'], item.dayNumber),
        orderInt: this.resolveNumber(entry['orderInt'], position + 1)
      });
    });

    if (!changed) {
      return null;
    }

    const remaining = items.filter((item) => !nextItems.some((next) => this.sameItemIdentity(item, next)));
    const merged = [...nextItems, ...remaining].map((item, index) => ({
      ...item,
      orderInt: index + 1
    }));

    return { ...itinerary, items: merged };
  }

  private resolvePoiFromPayload(payload: Record<string, unknown> | undefined): { itemTypeCode: 'ACTIVITY' | 'ACCOMMODATION'; activityId?: number | null; accommodationId?: number | null; entityId: number } | null {
    const activityId = this.extractNumericId(payload?.['activityId']);
    if (activityId) {
      return { itemTypeCode: 'ACTIVITY', activityId, entityId: activityId };
    }

    const accommodationId = this.extractNumericId(payload?.['accommodationId']);
    if (accommodationId) {
      return { itemTypeCode: 'ACCOMMODATION', accommodationId, entityId: accommodationId };
    }

    const title = this.resolveString(payload?.['title'] || payload?.['name'] || payload?.['poiTitle']);
    if (!title) {
      return null;
    }

    const normalizedTitle = this.normalizeText(title);
    const activity = this.workspace?.activities.find((entry) => this.normalizeText(entry.name).includes(normalizedTitle) || normalizedTitle.includes(this.normalizeText(entry.name)));
    if (activity) {
      return { itemTypeCode: 'ACTIVITY', activityId: activity.id, entityId: activity.id };
    }

    const accommodation = this.workspace?.accommodations.find((entry) => this.normalizeText(entry.name).includes(normalizedTitle) || normalizedTitle.includes(this.normalizeText(entry.name)));
    if (accommodation) {
      return { itemTypeCode: 'ACCOMMODATION', accommodationId: accommodation.id, entityId: accommodation.id };
    }

    return null;
  }

  private findItemIndex(items: ItineraryItem[], payload: Record<string, unknown> | undefined): number {
    const itemId = this.extractNumericId(payload?.['id']);
    if (itemId) {
      const byId = items.findIndex((item) => item.id === itemId);
      if (byId !== -1) return byId;
    }

    const activityId = this.extractNumericId(payload?.['activityId']);
    if (activityId) {
      const byActivity = items.findIndex((item) => item.activityId === activityId);
      if (byActivity !== -1) return byActivity;
    }

    const accommodationId = this.extractNumericId(payload?.['accommodationId']);
    if (accommodationId) {
      const byAccommodation = items.findIndex((item) => item.accommodationId === accommodationId);
      if (byAccommodation !== -1) return byAccommodation;
    }

    const dayNumber = this.extractNumericId(payload?.['dayNumber']);
    const orderInt = this.extractNumericId(payload?.['orderInt']);
    if (dayNumber && orderInt) {
      const byPosition = items.findIndex((item) => item.dayNumber === dayNumber && item.orderInt === orderInt);
      if (byPosition !== -1) return byPosition;
    }

    const title = this.resolveString(payload?.['title'] || payload?.['name'] || payload?.['poiTitle']);
    if (title) {
      const normalizedTitle = this.normalizeText(title);
      const byTitle = items.findIndex((item) => {
        const poi = this.getWorkspacePoiForItem(item);
        return poi ? this.normalizeText(poi.title).includes(normalizedTitle) || normalizedTitle.includes(this.normalizeText(poi.title)) : false;
      });
      if (byTitle !== -1) return byTitle;
    }

    return -1;
  }

  private getWorkspacePoiForItem(item: ItineraryItem): { title: string; type: 'activity' | 'accommodation' } | null {
    if (item.activityId) {
      const activity = this.workspace?.activities.find((entry) => entry.id === item.activityId);
      if (activity) {
        return { title: activity.name, type: 'activity' };
      }
    }

    if (item.accommodationId) {
      const accommodation = this.workspace?.accommodations.find((entry) => entry.id === item.accommodationId);
      if (accommodation) {
        return { title: accommodation.name, type: 'accommodation' };
      }
    }

    return null;
  }

  private getItemKey(item: ItineraryItem): string {
    if (item.activityId) return `activity-${item.activityId}`;
    if (item.accommodationId) return `accommodation-${item.accommodationId}`;
    return `item-${item.id ?? item.dayNumber}-${item.orderInt}`;
  }

  private getActionKey(entry: Record<string, unknown>): string | null {
    const activityId = this.extractNumericId(entry['activityId']);
    if (activityId) return `activity-${activityId}`;

    const accommodationId = this.extractNumericId(entry['accommodationId']);
    if (accommodationId) return `accommodation-${accommodationId}`;

    const id = this.extractNumericId(entry['id']);
    if (id) return `item-${id}`;

    return null;
  }

  private sameItemIdentity(a: ItineraryItem, b: ItineraryItem): boolean {
    return this.getItemKey(a) === this.getItemKey(b);
  }

  private isSamePoiItem(item: ItineraryItem, type: 'ACTIVITY' | 'ACCOMMODATION', entityId: number): boolean {
    if (type === 'ACTIVITY') {
      return item.activityId === entityId;
    }

    return item.accommodationId === entityId;
  }

  private extractNumericId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    return null;
  }

  private resolveNumber(value: unknown, fallback: number): number {
    const parsed = this.extractNumericId(value);
    return parsed ?? fallback;
  }

  private resolveString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private resolveNullableString(value: unknown): string | null {
    if (value === null) {
      return null;
    }

    const text = this.resolveString(value);
    return text.length > 0 ? text : null;
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
