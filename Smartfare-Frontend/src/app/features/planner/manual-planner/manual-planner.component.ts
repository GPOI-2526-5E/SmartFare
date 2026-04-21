import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { SmartfareService } from '../../../core/services/smartfare-api.service';
import Location from '../../../core/models/location.model';

@Component({
  selector: 'app-manual-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './manual-planner.component.html',
  styleUrl: './manual-planner.component.css'
})
export class ManualPlannerComponent implements OnInit {
  destination: string = '';
  checkinDate: string = '';
  checkoutDate: string = '';

  allLocations: Location[] = [];
  filteredLocations: Location[] = [];
  showSuggestions: boolean = false;

  constructor(
    private router: Router,
    private smartfareService: SmartfareService
  ) { }

  ngOnInit(): void {
    this.smartfareService.getLocations().subscribe({
      next: (locations) => {
        this.allLocations = locations;
      },
      error: (err) => {
        console.error('Error fetching locations:', err);
      }
    });
  }

  onDestinationInput() {
    if (!this.destination || this.destination.length < 2) {
      this.filteredLocations = [];
      this.showSuggestions = false;
      return;
    }

    const query = this.destination.toLowerCase();
    const queryDigits = this.destination.replace(/\D/g, '');

    this.filteredLocations = this.allLocations.filter(loc =>
      loc.name.toLowerCase().includes(query) ||
      loc.province.toLowerCase().includes(query) ||
      (!!queryDigits && String(loc.cap ?? '').includes(queryDigits))
    ).slice(0, 10); // Limit to 10 suggestions for better UI

    this.showSuggestions = this.filteredLocations.length > 0;
  }

  selectLocation(location: Location) {
    this.destination = `${location.name} (${location.province})`;
    this.showSuggestions = false;
    this.filteredLocations = [];
  }

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
