import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-preview-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preview-hero.component.html',
  styleUrl: './preview-hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewHeroComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) destination = '';
  @Input() description = '';
  @Input() coverImage: string | null = null;
  @Input() durationLabel = 'Itinerario';
  @Input() stopCount = 0;
  @Input() authorName: string | null = null;
  @Input() isPublished = false;
}
