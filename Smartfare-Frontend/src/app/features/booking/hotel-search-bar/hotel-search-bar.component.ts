import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HotelSearchCriteria } from '../../../core/models/hotel-search.model';
import Location from '../../../core/models/location.model';
import { SmartfareService } from '../../../core/services/smartfare-api.service';

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

  constructor(private smartfareService: SmartfareService) { };

  ngOnInit() {
    this.smartfareService.GetLocations().subscribe({
      next: (res) => {
        this.locations.set(res.data ?? []);
      },
      error: (error) => {
        console.log(error);
      }
    });
  }
  showSuggestions = false;
  readonly today = new Date().toISOString().split('T')[0];

  get filteredLocations(): Location[] {
    const query = this.destination.trim().toLocaleLowerCase('it-IT');
    const locations = this.locations();

    if (!query) {
      return locations.slice(0, 3);
    }

    return locations
      .filter((location) =>
        location.name.toLocaleLowerCase('it-IT').startsWith(query) ||
        location.province.toLocaleLowerCase('it-IT').startsWith(query)
      )
      .slice(0, 3);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.search.emit({
      destination: this.destination.trim(),
      checkin: this.checkin,
      checkout: this.checkout,
      guests: this.guests,
    });
  }

  openSuggestions(): void {
    this.showSuggestions = true;
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
}
