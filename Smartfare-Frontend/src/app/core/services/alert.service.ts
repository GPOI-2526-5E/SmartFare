import { Injectable, signal } from '@angular/core';

export type AlertType = 'info' | 'danger' | 'success' | 'warning';

export interface AlertMessage {
  message: string;
  type: AlertType;
}

@Injectable({
  providedIn: 'root',
})

export class AlertService {
  private readonly alertSignal = signal<AlertMessage | null>(null);
  readonly alert = this.alertSignal.asReadonly();

  show(message: string, type: AlertType = 'info'): void {
    this.alertSignal.set({ message, type });
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  error(message: string): void {
    this.show(message, 'danger');
  }
}
