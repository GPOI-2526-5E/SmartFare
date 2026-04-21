import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../ui/navbar/navbar.component';
import { SmartfareService } from '../../../core/services/smartfare-api.service';
import { ItineraryService } from '../../../core/services/itinerary.service';
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

  // Persistence State
  showResumeChoice = signal(false);

  constructor(
    private router: Router,
    private smartfareService: SmartfareService,
    private itineraryService: ItineraryService
  ) {
    this.setDefaultDates();
  }

  private setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    this.checkinDate = today.toISOString().split('T')[0];
    this.checkoutDate = tomorrow.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    // 1. Fetch Locations for autocomplete
    this.smartfareService.getLocations().subscribe({
      next: (locations) => {
        this.allLocations = locations;
      },
      error: (err) => {
        console.error('Error fetching locations:', err);
      }
    });

    // 2. Check for existing draft to offer resume
    // In-memory first, then backend for logged users
    if (this.itineraryService.hasDraft()) {
      this.showResumeChoice.set(true);
    } else {
      this.itineraryService.loadLatestFromBackend().subscribe(draft => {
        if (draft) {
          this.showResumeChoice.set(true);
        }
      });
    }
  }

  resumeItinerary() {
    const draft = this.itineraryService.itinerary();
    if (draft) {
      // Navigate to builder
      this.router.navigate(['/itineraries', 'builder']);
    }
    this.showResumeChoice.set(false);
  }

  createNewItinerary() {
    // Clear everything and hide choice
    this.itineraryService.clearDraft();
    this.showResumeChoice.set(false);
    this.destination = '';
    this.setDefaultDates();
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

    // Set persistence state before navigating
    this.itineraryService.setCurrentItinerary({
      name: `Viaggio a ${this.destination}`,
      startDate: this.checkinDate,
      endDate: this.checkoutDate,
      items: []
    });

    const queryParams = {
      dest: this.destination,
      in: this.checkinDate,
      out: this.checkoutDate
    };

    this.router.navigate(['/itineraries', 'builder'], { queryParams });
  }
}
