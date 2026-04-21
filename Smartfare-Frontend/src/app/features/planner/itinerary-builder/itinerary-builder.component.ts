import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { BuilderHeaderComponent } from './components/builder-header/builder-header.component';
import { BuilderSidebarComponent } from './components/builder-sidebar/builder-sidebar.component';
import { BuilderMapComponent } from './components/builder-map/builder-map.component';
import { BuilderChatComponent } from './components/builder-chat/builder-chat.component';
import { ItineraryService } from '../../../core/services/itinerary.service';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginPromptModalComponent } from '../../ui/modals/login-prompt-modal/login-prompt-modal.component';

@Component({
  selector: 'app-itinerary-builder',
  standalone: true,
  imports: [
    CommonModule,
    BuilderHeaderComponent,
    BuilderSidebarComponent,
    BuilderMapComponent,
    BuilderChatComponent,
    LoginPromptModalComponent
  ],
  templateUrl: './itinerary-builder.component.html',
  styleUrl: './itinerary-builder.component.css'
})
export class ItineraryBuilderComponent implements OnInit {
  showLoginPrompt = signal(false);
  private targetUrl: string | null = null;

  constructor(
    private itineraryService: ItineraryService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const hasCurrentInMemory = !!this.itineraryService.itinerary();
    if (hasCurrentInMemory || !this.authService.IsAuthenticated()) return;

    this.itineraryService.loadLatestFromBackend().subscribe((draft) => {
      if (draft) return;

      const query = this.route.snapshot.queryParams;
      const destination = query['dest'];

      if (!destination) return;

      this.itineraryService.setCurrentItinerary({
        name: `Viaggio a ${destination}`,
        startDate: query['in'],
        endDate: query['out'],
        items: []
      });
    });
  }

  /**
   * Called when the user clicks explicitly on a link that takes them away from the builder.
   * e.g., the Home logo.
   */
  handleNavigationIntercept(url: string) {
    if (this.authService.IsAuthenticated()) {
      // Auto-save logic for logged-in users
      const current = this.itineraryService.itinerary();
      if (current) {
        // We sync with backend
        this.itineraryService.saveToBackend(current).subscribe(() => {
          this.router.navigate([url]);
        });
      } else {
        this.router.navigate([url]);
      }
    } else {
      // Guest users: show the "Login to save" prompt
      this.targetUrl = url;
      this.showLoginPrompt.set(true);
    }
  }

  onLoginRedirect() {
    // Navigate to login, we'll lose the draft in memory but it stays in localStorage
    // because ItineraryService.setCurrentItinerary writes there.
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  onContinueExit() {
    // User chooses to leave without saving
    this.itineraryService.clearDraft();
    if (this.targetUrl) {
      this.router.navigate([this.targetUrl]);
    }
    this.showLoginPrompt.set(false);
  }

  closeModal() {
    this.showLoginPrompt.set(false);
  }
}
