import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-prompt-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-prompt-modal.component.html',
  styleUrl: './login-prompt-modal.component.css'
})
export class LoginPromptModalComponent {
  @Output() login = new EventEmitter<void>();
  @Output() continueWithoutSaving = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  onLogin() { this.login.emit(); }
  onContinueWithoutSaving() { this.continueWithoutSaving.emit(); }
  onClose() { this.close.emit(); }
}
