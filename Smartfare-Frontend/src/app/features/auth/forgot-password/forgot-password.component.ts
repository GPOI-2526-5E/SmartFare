import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { LoaderService } from '../../../core/services/loader.service';
import { NavbarComponent } from "../../ui/navbar/navbar.component";

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email: string = '';
  isSubmitting: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private loaderService: LoaderService,
    private router: Router
  ) {}

  onSubmit() {
    if (!this.email) {
      this.errorMessage = "Inserisci un'email valida";
      this.alertService.error(this.errorMessage);
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.loaderService.show();

    this.authService.ForgotPassword(this.email).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.loaderService.hide();
        if (response.success) {
          this.successMessage = "Ti abbiamo inviato un'email con il link per reimpostare la password.";
          this.alertService.success(this.successMessage);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.loaderService.hide();
        this.errorMessage = err.error?.error || "Si è verificato un errore, riprova.";
        this.alertService.error(this.errorMessage);
      }
    });
  }
}
