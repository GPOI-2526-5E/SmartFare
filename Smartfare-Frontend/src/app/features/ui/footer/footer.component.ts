import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LegalService } from '../../../core/services/legal.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  private readonly legalService = inject(LegalService);

  openPrivacyPolicy(event: Event) {
    event.preventDefault();
    this.legalService.openPrivacyModal();
  }

  openCookiePolicy(event: Event) {
    event.preventDefault();
    this.legalService.openCookieModal();
  }

  openTosPolicy(event: Event) {
    event.preventDefault();
    this.legalService.openTosModal();
  }
}
