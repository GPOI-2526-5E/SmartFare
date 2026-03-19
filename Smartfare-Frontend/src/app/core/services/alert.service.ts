import { Injectable, signal } from '@angular/core';

export type AlertType = 'info' | 'danger';

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
    this.show(message, 'info');
  }

  error(message: string): void {
    this.show(message, 'danger');
  }
}
