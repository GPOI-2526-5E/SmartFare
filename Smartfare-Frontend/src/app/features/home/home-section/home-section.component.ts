import { Component } from '@angular/core';
import { NavbarComponent } from "../../ui/navbar/navbar.component";
import { BookingFormComponent } from "../booking-form/booking-form.component";

@Component({
  selector: 'app-home-section',
  standalone: true,
  imports: [NavbarComponent, BookingFormComponent],
  templateUrl: './home-section.component.html',
  styleUrl: './home-section.component.css',
})
export class HomeSectionComponent {
  readonly heroContent = {
    title: 'Explore the World',
    subtitle: 'Find the best hotels, tours, and activities for your next adventure. Book with confidence and get the best prices.',
    primaryActionLabel: 'Start Exploring',
    secondaryActionLabel: 'Learn More',
    backgroundImageUrl: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?auto=format&fit=crop&q=80&w=2071'
  };
}
