import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalService } from '../../../core/services/legal.service';

@Component({
  selector: 'sf-tos-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: `./tos-modal.component.html`,
  styleUrl: `../privacy-modal/privacy-modal.component.css` // Reuse privacy modal styles
})
export class TosModalComponent {
  private readonly legalService = inject(LegalService);
  
  get isVisible() {
    return this.legalService.showTosModal();
  }

  onClose() {
    this.legalService.closeTosModal();
  }
}
