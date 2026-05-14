import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Error Boundary Component
 * Catches errors in child components and displays a fallback UI
 * Prevents the entire app from crashing
 */
@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-boundary.component.html',
  styleUrls: ['./error-boundary.component.css']
})
export class ErrorBoundaryComponent implements OnInit {
  @Input() fallbackMessage = 'Si è verificato un errore imprevisto.';
  @Output() errorCaught = new EventEmitter<Error>();

  hasError = false;
  errorMessage = '';
  errorDetails = '';
  showDetails = false;

  ngOnInit() {
    this.wrapLifecycle();
  }

  private wrapLifecycle() {
    // Override ngAfterViewInit to catch errors from child components
    const originalNgAfterViewInit = this.ngAfterViewInit;
    this.ngAfterViewInit = () => {
      try {
        originalNgAfterViewInit?.call(this);
      } catch (error) {
        this.handleError(error as Error);
      }
    };
  }

  handleError(error: Error | unknown) {
    console.error('[ErrorBoundary] Errore catturato:', error);

    this.hasError = true;

    if (error instanceof Error) {
      this.errorMessage = error.message || this.fallbackMessage;
      this.errorDetails = `${error.name}: ${error.message}\n\nStack: ${error.stack}`;
      this.errorCaught.emit(error);
    } else {
      this.errorMessage = this.fallbackMessage;
      this.errorDetails = String(error);
      this.errorCaught.emit(new Error(String(error)));
    }
  }

  reset() {
    this.hasError = false;
    this.errorMessage = '';
    this.errorDetails = '';
    this.showDetails = false;
  }

  ngAfterViewInit() {
    // Placeholder for lifecycle wrapping
  }
}
