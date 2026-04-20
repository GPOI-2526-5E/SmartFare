import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { LoaderService } from '../../../core/services/loader.service';
import { NavbarComponent } from "../../ui/navbar/navbar.component";

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  token: string | null = null;
  newPassword: string = '';
  confirmPassword: string = '';
  isSubmitting: boolean = false;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private alertService: AlertService,
    private loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.errorMessage = 'Token non valido o mancante. Richiedi un nuovo reset.';
        this.alertService.error(this.errorMessage);
      }
    });
  }

  onSubmit() {
    if (!this.token) {
      this.alertService.error('Token non valido. Impossibile procedere.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.alertService.error('Le password non corrispondono.');
      return;
    }

    if (this.newPassword.length < 8) {
      this.alertService.error('La password deve essere di almeno 8 caratteri.');
      return;
    }

    this.isSubmitting = true;
    this.loaderService.show();

    this.authService.ResetPassword(this.token, this.newPassword).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.loaderService.hide();
        if (response.success) {
          this.alertService.success('Password aggiornata con successo! Reindirizzamento al login...');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.loaderService.hide();
        const msg = err.error?.message || err.error?.error || "Si è verificato un errore durante il reset.";
        this.alertService.error(msg);
      }
    });
  }
}
