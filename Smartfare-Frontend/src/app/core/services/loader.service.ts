import { Injectable, computed, signal } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class LoaderService {
    private readonly defaultMessage = 'Sto preparando il tuo itinerario...';
    private readonly activeRequests = signal(0);
    private readonly currentMessage = signal(this.defaultMessage);

    readonly isLoading = computed(() => this.activeRequests() > 0);
    readonly message = this.currentMessage.asReadonly();

    show(message?: string): void {
        if (message?.trim()) {
            this.currentMessage.set(message);
        }

        this.activeRequests.update((count) => count + 1);
    }

  
    hide(): void {
        const nextCount = Math.max(0, this.activeRequests() - 1);
        this.activeRequests.set(nextCount);

        if (nextCount === 0) {
            this.currentMessage.set(this.defaultMessage);
        }
    }
}
