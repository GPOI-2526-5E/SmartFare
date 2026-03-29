import { Component } from '@angular/core';
import { NavbarComponent } from "../../ui/navbar/navbar.component";
import { BookingFormComponent } from "../booking-form/booking-form.component";
import { HotelBooking } from "../../booking/hotel-booking/hotel-booking";

@Component({
  selector: 'app-home-section',
  standalone: true,
  imports: [NavbarComponent, BookingFormComponent, HotelBooking],
  templateUrl: './home-section.component.html',
  styleUrl: './home-section.component.css',
})
export class HomeSectionComponent {

}
