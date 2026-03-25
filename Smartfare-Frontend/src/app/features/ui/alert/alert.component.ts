import { Component, OnDestroy, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService, AlertType } from '../../../core/services/alert.service';

@Component({
  selector: 'app-alert',
  imports: [CommonModule],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.css',
})
export class AlertComponent implements OnDestroy {

  readonly visible = signal(false);
  readonly message = signal('');
  readonly type = signal<AlertType>('info');
  private timeoutId?: any;

  constructor(private alertService: AlertService) {
    effect(() => {
      const alert = this.alertService.alert();
      if (!alert) {
        return;
      }

      this.message.set(alert.message);
      this.type.set(alert.type);
      this.visible.set(true);

      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(() => {
        this.close();
      }, 5000);
    });
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  close(): void {
    this.visible.set(false);
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  iconClass(): string {
    return this.type() === 'danger' ? 'bi-exclamation-octagon-fill' : 'bi-check-circle-fill';
  }

  title(): string {
    return this.type() === 'danger' ? 'Attenzione' : 'Operazione completata';
  }
}
