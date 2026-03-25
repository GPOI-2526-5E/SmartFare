import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AlertComponent } from "./features/ui/alert/alert.component";
import { LoaderHomeComponent } from './features/ui/loader/loader.component';
import { LoaderService } from './core/services/loader.service';
import { SidebarComponent } from './features/layout/sidebar/sidebar.component';
import { SidebarService } from './core/services/sidebar.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, AlertComponent, LoaderHomeComponent, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  private loaderService = inject(LoaderService);
  private sidebarService = inject(SidebarService);

  isLoading = this.loaderService.isLoading;
  loaderMessage = this.loaderService.message;
  isSidebarOpen = this.sidebarService.isSidebarOpen;
}
