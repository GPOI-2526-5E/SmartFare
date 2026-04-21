import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { NavbarComponent } from "../../ui/navbar/navbar.component";

import { GoogleSigninButtonModule, SocialAuthService } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, RouterModule, GoogleSigninButtonModule],
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
  showPassword = false;
  private googleLoginInProgress = false;
  private returnUrl: string = '/';

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute,
    private socialAuthService: SocialAuthService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { googleData: any };
    
    if (state && state.googleData) {
      this.handleGoogleData(state.googleData);
    }
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.socialAuthService.authState.subscribe((user) => {
      if (user && user.idToken && !this.googleLoginInProgress && !this.authService.IsAuthenticated()) {
        this.googleLoginInProgress = true;
        this.authService.LoginWithGoogle(user.idToken).subscribe({
          next: (res) => {
            if (res.needsRegistration && res.userData) {
              this.alertService.success('Profilo caricato da Google!');
              this.handleGoogleData(res.userData);
            } else if (res.token) {
              this.alertService.success('Accesso effettuato con successo!');
              this.authService.saveAuth(res.token);
              this.router.navigateByUrl(this.returnUrl);
            }
            this.googleLoginInProgress = false;
          },
          error: (err) => {
            this.alertService.error('Errore durante il caricamento da Google');
            this.googleLoginInProgress = false;
          }
        });
      }
    });
  }

  private handleGoogleData(data: any) {
    this.isGoogleRegistration = true;
    this.registerData.email = data.email;
    this.registerData.name = data.name || '';
    this.registerData.surname = data.surname || '';
    this.registerData.avatarUrl = data.avatarUrl || '';
  }

  async goToLogin() {
    try {
      // Sign out from Google to allow changing account or using email/password
      await this.socialAuthService.signOut();
    } catch (e) {
      // In case they weren't logged in to begin with
    }
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl } });
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
        this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl } });
      },
      error: (err) => {
        this.alertService.error(err.error?.message || 'Errore durante la registrazione');
      }
    });
  }
}
