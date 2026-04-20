import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../ui/navbar/navbar.component';

@Component({
  selector: 'app-manual-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './manual-planner.component.html',
  styleUrl: './manual-planner.component.css'
})
export class ManualPlannerComponent {
  destination: string = '';
  checkinDate: string = '';
  checkoutDate: string = '';

  constructor(private router: Router) { }

  startPlanning() {
    if (!this.destination || !this.checkinDate || !this.checkoutDate) {
      alert('Per favore, compila tutti i campi richiesti.');
      return;
    }

    // Convert to whatever shape the query params need
    // For now we navigate to the itinerary builder with route params
    const queryParams = {
      dest: this.destination,
      in: this.checkinDate,
      out: this.checkoutDate
    };

    // Using a placeholder route /itineraries/builder or similar dashboard route
    this.router.navigate(['/itineraries', 'builder'], { queryParams });
  }
}
