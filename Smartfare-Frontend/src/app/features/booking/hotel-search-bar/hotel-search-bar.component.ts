import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HotelSearchCriteria } from '../../../core/models/hotel-search.model';
import Location from '../../../core/models/location.model';
import { SmartfareService } from '../../../core/services/smartfare-api.service';
import { AlertService } from '../../../core/services/alert.service';

interface IndexedLocation {
  location: Location;
  searchableValues: string[];
}

@Component({
  selector: 'app-hotel-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hotel-search-bar.component.html',
  styleUrl: './hotel-search-bar.component.css',
})
export class HotelSearchBarComponent implements OnInit {
  @Input() destination = '';
  @Input() checkin = '';
  @Input() checkout = '';
  @Input() guests = 2;
  @Output() search = new EventEmitter<HotelSearchCriteria>();

  locations = signal<Location[]>([]);
  filteredLocations = signal<Location[]>([]);
  private indexedLocations: IndexedLocation[] = [];

  constructor(private smartfareService: SmartfareService, private alertService: AlertService) { };

  ngOnInit() {
    this.smartfareService.GetLocations().subscribe({
      next: (res) => {
        const locations = res.data ?? [];
        this.locations.set(locations);
        this.indexedLocations = locations.map((location) => ({
          location,
          searchableValues: [
            this.normalizeSearchValue(location.name),
            this.normalizeSearchValue(location.province),
            this.normalizeSearchValue(String(location.cap)),
            this.normalizeSearchValue(`${location.name} ${location.cap}`),
            this.normalizeSearchValue(`${location.name} ${location.province} ${location.cap}`),
          ],
        }));
        this.updateFilteredLocations();
      },
      error: (error) => {
        console.log(error);
      }
    });
  }
  showSuggestions = false;
  readonly today = new Date().toISOString().split('T')[0];

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.verifyDate())
      return this.alertService.error("La data di checkin non può essere successiva al checkout");
    this.search.emit({
      destination: this.destination.trim(),
      checkin: this.checkin,
      checkout: this.checkout,
      guests: this.guests,
    });
  }

  verifyDate() {
    return this.checkin < this.checkout;
  }

  openSuggestions(): void {
    this.showSuggestions = true;
    this.updateFilteredLocations();
  }

  closeSuggestions(): void {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 120);
  }

  selectLocation(location: Location): void {
    this.destination = location.name;
    this.showSuggestions = false;
  }

  onDestinationChange(value: string): void {
    this.destination = value;
    this.showSuggestions = true;
    this.updateFilteredLocations();
  }

  private updateFilteredLocations(): void {
    const query = this.normalizeSearchValue(this.destination);

    if (!query) {
      return;
    }

    const queryTokens = query.split(/\s+/).filter(Boolean);
    const matches = this.indexedLocations
      .filter((indexedLocation) => this.matchesLocation(indexedLocation, queryTokens))
      .slice(0, 4)
      .map((indexedLocation) => indexedLocation.location);

    this.filteredLocations.set(matches);
  }

  private matchesLocation(indexedLocation: IndexedLocation, queryTokens: string[]): boolean {
    return queryTokens.every((token) =>
      indexedLocation.searchableValues.some((value) => value.includes(token))
    );
  }

  private normalizeSearchValue(value: string): string {
    return value.trim().toLocaleLowerCase('it-IT');
  }
}
