import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { BuilderHeaderComponent } from './components/builder-header/builder-header.component';
import { BuilderSidebarComponent } from './components/builder-sidebar/builder-sidebar.component';
import { BuilderMapComponent } from './components/builder-map/builder-map.component';
import { BuilderChatComponent } from './components/builder-chat/builder-chat.component';

@Component({
  selector: 'app-itinerary-builder',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    BuilderHeaderComponent,
    BuilderSidebarComponent,
    BuilderMapComponent,
    BuilderChatComponent
  ],
  templateUrl: './itinerary-builder.component.html',
  styleUrl: './itinerary-builder.component.css'
})
export class ItineraryBuilderComponent {
  // Init data could be fetched from query params later
}
