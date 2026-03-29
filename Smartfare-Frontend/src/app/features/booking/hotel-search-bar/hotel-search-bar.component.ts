import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hotel-search-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './hotel-search-bar.component.html',
  styleUrl: './hotel-search-bar.component.css',
})
export class HotelSearchBarComponent {
  destination = '';
  guests = 2;
  readonly today = new Date().toISOString().split('T')[0];

  onSubmit(event: Event): void {
    event.preventDefault();
  }
}
