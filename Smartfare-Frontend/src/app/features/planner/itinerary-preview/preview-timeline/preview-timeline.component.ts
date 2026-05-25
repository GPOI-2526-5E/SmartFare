import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PreviewDay } from '../preview.types';

@Component({
  selector: 'app-preview-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preview-timeline.component.html',
  styleUrl: './preview-timeline.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewTimelineComponent {
  @Input({ required: true }) days: PreviewDay[] = [];
  @Input() hasStops = false;
}
