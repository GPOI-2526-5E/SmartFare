import { Component } from '@angular/core';
import { NavbarComponent } from '../../ui/navbar/navbar.component';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [NavbarComponent],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.css',
})
export class BookingFormComponent {
  readonly categories = [
    { label: 'Hotel', icon: 'bi-building' },
    { label: 'Tours', icon: 'bi-compass' },
    { label: 'Activity', icon: 'bi-person-walking' },
    { label: 'Rental', icon: 'bi-house' },
    { label: 'Car', icon: 'bi-car-front' },
    { label: 'Yacht', icon: 'bi-water' },
    { label: 'Flights', icon: 'bi-airplane' },
  ];

  readonly topDestinations = [
    {
      title: 'United Kingdom',
      image:
        'https://images.unsplash.com/photo-1488747279002-c8523379faaa?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Turkey',
      image:
        'https://images.unsplash.com/photo-1669880181886-75299f1fcf9e?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Spain',
      image:
        'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=900&q=80',
    },
  ];

  readonly morePlaces = [
    {
      title: 'Mykonos',
      subtitle: 'Cyclades Islands, Greece',
      description: 'Spiagge iconiche, vicoli bianchi e vita notturna vivace.',
      image:
        'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Crete',
      subtitle: 'Heraklion, Greece',
      description: 'Storia minoica, mare cristallino e cucina tradizionale.',
      image:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Rhodes',
      subtitle: 'Dodecanese, Greece',
      description: 'Cittadella medievale, tramonti dorati e resort sul mare.',
      image:
        'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=900&q=80',
    },
  ];

}
