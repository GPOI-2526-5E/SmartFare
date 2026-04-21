import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-booking-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.css',
  standalone: true,
})
export class BookingFormComponent implements OnInit, OnDestroy {

  travelQuery: string = '';
  currentPlaceholder: string = '';

  private placeholders: string[] = [
    "Es: Voglio fare un weekend romantico a Parigi...",
    "Es: Organizza un viaggio on the road in California...",
    "Es: Cerco una vacanza rilassante al mare in Puglia...",
    "Es: Portami a scoprire l'aurora boreale in Islanda..."
  ];

  private placeholderIndex: number = 0;
  private charIndex: number = 0;
  private isDeleting: boolean = false;
  private typingTimeout: any;

  constructor(
    private router: Router,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    // Delay the initial call to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => this.typeNext(), 0);
  }

  ngOnDestroy() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  private typeNext() {
    const currentText = this.placeholders[this.placeholderIndex];
    let typeSpeed = 50;

    if (this.isDeleting) {
      this.currentPlaceholder = currentText.substring(0, this.charIndex - 1);
      this.charIndex--;
      typeSpeed = 25; // Faster deletion
    } else {
      this.currentPlaceholder = currentText.substring(0, this.charIndex + 1);
      this.charIndex++;
    }

    if (!this.isDeleting && this.charIndex === currentText.length) {
      typeSpeed = 2500; // Pause at end of text
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.placeholderIndex = (this.placeholderIndex + 1) % this.placeholders.length;
      typeSpeed = 500; // Pause before starting next text
    }

    this.typingTimeout = setTimeout(() => this.typeNext(), typeSpeed);
  }

  onAIGenerate(): void {
    if (!this.travelQuery.trim()) {
      this.alertService.show("Inserisci almeno qualche dettaglio per far lavorare l'IA.");
      return;
    }
    // Navigate to the AI Planner with the user's prompt as a query parameter
    this.router.navigate(['/planner'], { queryParams: { prompt: this.travelQuery } });
  }

  onManualCreate(): void {
    this.router.navigate(['/itineraries', 'new']);
  }
}
