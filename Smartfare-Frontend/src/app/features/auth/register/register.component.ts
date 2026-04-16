import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { NavbarComponent } from "../../ui/navbar/navbar.component";

import { GoogleSigninButtonModule, SocialAuthService } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  registerData = {
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    surname: '',
    avatarUrl: ''
  };

  isGoogleRegistration = false;

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private router: Router,
    private socialAuthService: SocialAuthService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { googleData: any };
    
    if (state && state.googleData) {
      this.isGoogleRegistration = true;
      this.registerData.email = state.googleData.email;
      this.registerData.name = state.googleData.name || '';
      this.registerData.surname = state.googleData.surname || '';
      this.registerData.avatarUrl = state.googleData.avatarUrl || '';
    }
  }

  ngOnInit(): void {}

  async goToLogin() {
    try {
      // Sign out from Google to allow changing account or using email/password
      await this.socialAuthService.signOut();
    } catch (e) {
      // In case they weren't logged in to begin with
    }
    this.router.navigate(['/login']);
  }

  onSubmit() {
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.alertService.error('Le password non corrispondono');
      return;
    }

    if (this.registerData.password.length < 6) {
      this.alertService.error('La password deve essere di almeno 6 caratteri');
      return;
    }

    const { confirmPassword, ...data } = this.registerData;

    this.authService.Register(data).subscribe({
      next: (res) => {
        this.alertService.success('Registrazione completata! Ora puoi effettuare il login.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.alertService.error(err.error?.message || 'Errore durante la registrazione');
      }
    });
  }
}
