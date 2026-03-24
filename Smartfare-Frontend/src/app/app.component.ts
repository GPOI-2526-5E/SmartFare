import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './features/layout/sidebar/sidebar.component';
import { FooterComponent } from './features/layout/footer/footer.component';
import { SidebarService } from './core/services/sidebar.service';
import { AlertComponent } from "./features/ui/alert/alert.component";
import { LoaderHomeComponent } from './features/ui/loader/loader.component';
import { LoaderService } from './core/services/loader.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, SidebarComponent, FooterComponent, AlertComponent, LoaderHomeComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  private sidebarService = inject(SidebarService);
  private loaderService = inject(LoaderService);

  isSidebarOpen = this.sidebarService.isSidebarOpen;
  isLoading = this.loaderService.isLoading;
  loaderMessage = this.loaderService.message;
}
