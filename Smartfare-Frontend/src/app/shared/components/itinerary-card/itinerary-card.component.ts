import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Itinerary } from '../../../core/models/itinerary.model';

@Component({
  selector: 'app-itinerary-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './itinerary-card.component.html',
  styleUrl: './itinerary-card.component.css'
})
export class ItineraryCardComponent {
  @Input({ required: true }) itinerary!: Itinerary;
  @Input() mode: 'link' | 'emit' = 'link';
  
  @Output() cardClick = new EventEmitter<Itinerary>();

  getDuration(): string {
    const days = this.itinerary.durationDays;
    if (days != null && days > 0) {
      return `${days} ${days === 1 ? 'Giorno' : 'Giorni'} di Viaggio`;
    }
    return 'Durata non definita';
  }

  getItemCount(): number {
    return this.itinerary._count?.items ?? this.itinerary.items?.length ?? 0;
  }

  getLikesCount(): number {
    return this.itinerary._count?.favorites ?? 0;
  }

  getCreatorName(): string {
    const p = this.itinerary.user?.profile;
    if (p?.name || p?.surname) {
      return `${p.name ?? ''} ${p.surname ?? ''}`.trim();
    }
    return 'Utente SmartFare';
  }

  getCreatorInitials(): string {
    const p = this.itinerary.user?.profile;
    const first = p?.name?.[0] ?? '';
    const last = p?.surname?.[0] ?? '';
    return (first + last).toUpperCase() || 'SF';
  }

  onActionClick(event?: Event) {
    if (this.mode === 'emit') {
      if (event) {
        event.stopPropagation();
      }
      this.cardClick.emit(this.itinerary);
    }
  }

  onCardBodyClick() {
    if (this.mode === 'emit') {
      this.cardClick.emit(this.itinerary);
    }
  }
}
