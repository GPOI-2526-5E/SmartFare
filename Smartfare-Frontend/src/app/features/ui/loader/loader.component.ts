import { Component, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css',
  standalone: true
})
export class LoaderHomeComponent {
  @Input() show = false;
  @Input() message = 'Caricamento...';
  @Output() hidden = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['show'] && changes['show'].currentValue === false) {
      this.hidden.emit();
    }
  }
}
