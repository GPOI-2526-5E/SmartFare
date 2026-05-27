import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalService } from '../../../core/services/legal.service';

@Component({
  selector: 'sf-privacy-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: `./privacy-modal.component.html`,
  styleUrl: `./privacy-modal.component.css`
})
export class PrivacyModalComponent {
  private readonly legalService = inject(LegalService);
  
  get isVisible() {
    return this.legalService.showPrivacyModal();
  }

  onClose() {
    this.legalService.closePrivacyModal();
  }
}
