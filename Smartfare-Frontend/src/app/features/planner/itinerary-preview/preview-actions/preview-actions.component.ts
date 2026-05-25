import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-preview-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preview-actions.component.html',
  styleUrl: './preview-actions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewActionsComponent {
  @Input() isOwner = false;
  @Input() isFavorite = false;
  @Input() isSaving = false;
  @Input() isCopying = false;
  @Input() isLoading = true;
  @Input() hasItinerary = false;
  @Input() isReadOnlyViewer = true;

  @Output() back = new EventEmitter<void>();
  @Output() favoriteToggle = new EventEmitter<void>();
  @Output() primaryAction = new EventEmitter<void>();
}
