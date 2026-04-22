import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { BuilderHeaderComponent } from './builder-header/builder-header.component';
import { BuilderSidebarComponent } from './builder-sidebar/builder-sidebar.component';
import { BuilderMapComponent } from './builder-map/builder-map.component';
import { BuilderChatComponent } from './builder-chat/builder-chat.component';
import { ItineraryService } from '../../../core/services/itinerary.service';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginPromptModalComponent } from '../../ui/modals/login-prompt-modal/login-prompt-modal.component';
import { UIStateService } from '../../../core/services/ui-state.service';

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
  ui = inject(UIStateService);
  private targetUrl: string | null = null;

  constructor(
    private itineraryService: ItineraryService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    const hasCurrentInMemory = !!this.itineraryService.itinerary();
    if (hasCurrentInMemory) return;

    // Guest users: try loading from storage first
    if (!this.authService.IsAuthenticated()) {
      this.itineraryService.loadFromStorage();
      return;
    }

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

  handleSaveRequest() {
    // Header emitted a save request but user is NOT authenticated
    this.targetUrl = null; // No final navigation target, just want to save
    this.showLoginPrompt.set(true);
  }

  onLoginRedirect() {
    // Ensure the current draft is in localStorage so it can be reloaded after login
    const current = this.itineraryService.itinerary();
    if (current) {
      this.itineraryService.setCurrentItinerary(current);
    }
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
