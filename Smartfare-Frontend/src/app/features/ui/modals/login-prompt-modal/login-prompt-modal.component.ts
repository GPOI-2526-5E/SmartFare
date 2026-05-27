import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Input } from '@angular/core';

@Component({
  selector: 'app-login-prompt-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-prompt-modal.component.html',
  styleUrl: './login-prompt-modal.component.css'
})
export class LoginPromptModalComponent {
  @Input() title = 'Salva il tuo lavoro';
  @Input() description = 'Non sei loggato. Se esci ora, i tuoi progressi sull\'itinerario non verranno salvati permanentemente.';
  @Input() highlight = 'Accedi o registrati per non perdere quello che hai fatto!';
  @Input() loginLabel = 'Accedi';
  @Input() secondaryLabel = 'Esci senza salvare';
  @Input() showSecondaryAction = true;

  @Output() login = new EventEmitter<void>();
  @Output() continueWithoutSaving = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  onLogin() { this.login.emit(); }
  onContinueWithoutSaving() { this.continueWithoutSaving.emit(); }
  onClose() { this.close.emit(); }
}
