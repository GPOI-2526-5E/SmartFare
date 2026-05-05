import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealOnScrollDirective } from '../../../core/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-features-grid',
  standalone: true,
  imports: [CommonModule, RevealOnScrollDirective],
  templateUrl: './features-grid.component.html',
  styleUrl: './features-grid.component.css'
})
export class FeaturesGridComponent { }
