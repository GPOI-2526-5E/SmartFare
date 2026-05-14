import { OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Base class for components that need proper cleanup
 * Automatically provides a destroy$ Subject for unsubscribing
 * Usage:
 *   export class MyComponent extends ComponentDestroyBase {
 *     constructor() { super(); }
 *     ngOnInit() {
 *       this.service.data$.pipe(
 *         takeUntil(this.destroy$)
 *       ).subscribe(...);
 *     }
 *   }
 */
export class ComponentDestroyBase implements OnDestroy {
  protected destroy$ = new Subject<void>();

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

/**
 * Utility to manage RxJS subscriptions safely
 * Tracks subscriptions and unsubscribes automatically on destroy
 */
export class SubscriptionManager {
  private subscriptions = new Map<string, any>();

  /**
   * Add a subscription to the manager
   */
  add(key: string, subscription: any) {
    // Unsubscribe from existing subscription with same key
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key)?.unsubscribe?.();
    }
    this.subscriptions.set(key, subscription);
  }

  /**
   * Remove a specific subscription
   */
  remove(key: string) {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      subscription.unsubscribe?.();
      this.subscriptions.delete(key);
    }
  }

  /**
   * Unsubscribe from all tracked subscriptions
   */
  unsubscribeAll() {
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe?.();
    }
    this.subscriptions.clear();
  }

  /**
   * Get number of active subscriptions
   */
  getCount(): number {
    return this.subscriptions.size;
  }
}

/**
 * Decorator to automatically manage subscription cleanup
 * Usage:
 *   @Component({...})
 *   @AutoUnsubscribe()
 *   export class MyComponent implements OnInit {
 *     ngOnDestroy() { } // Can be empty, cleanup happens automatically
 *   }
 */
export function AutoUnsubscribe() {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    const originalNgOnDestroy = constructor.prototype.ngOnDestroy;

    constructor.prototype.ngOnDestroy = function () {
      // Call original ngOnDestroy if it exists
      originalNgOnDestroy?.call(this);

      // Unsubscribe from all Observable properties
      for (const key in this) {
        const property = this[key];
        if (property && property.unsubscribe instanceof Function) {
          property.unsubscribe();
        }
      }
    };

    return constructor;
  };
}
