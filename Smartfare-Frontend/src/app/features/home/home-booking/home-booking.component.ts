import { Component } from '@angular/core';
import { NavbarComponent } from "../../ui/navbar/navbar.component";
import { BookingFormComponent } from "../booking-form/booking-form.component";

@Component({
  selector: 'app-home-booking',
  standalone: true,
  imports: [NavbarComponent, BookingFormComponent],
  templateUrl: './home-booking.component.html',
  styleUrl: './home-booking.component.css',
})
export class HomeBookingComponent {
  readonly heroContent = {
    title: 'Explore the World',
    subtitle: 'Find the best hotels, tours, and activities for your next adventure. Book with confidence and get the best prices.',
    primaryActionLabel: 'Start Exploring',
    secondaryActionLabel: 'Learn More',
    backgroundImageUrl: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?auto=format&fit=crop&q=80&w=2071'
  };
}
