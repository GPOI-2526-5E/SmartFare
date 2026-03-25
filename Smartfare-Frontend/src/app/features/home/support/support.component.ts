import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.css']
})
export class SupportComponent {
  name = '';
  email = '';
  message = '';

  constructor(private alertService: AlertService) { }

  submitRequest(): void {
    if (!this.name.trim() || !this.email.trim() || !this.message.trim()) {
      this.alertService.show('Compila tutti i campi prima di inviare la richiesta.', 'danger');
      return;
    }

    this.alertService.show('Richiesta inviata: ti risponderemo entro 24 ore.', 'info');
    this.name = '';
    this.email = '';
    this.message = '';
  }
}
