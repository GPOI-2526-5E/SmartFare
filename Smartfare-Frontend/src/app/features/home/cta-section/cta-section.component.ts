import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '../../../core/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-cta-section',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective],
  templateUrl: './cta-section.component.html',
  styleUrl: './cta-section.component.css'
})
export class CtaSectionComponent { }
