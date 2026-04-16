import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from "../../ui/navbar/navbar.component";
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Router, RouterLink } from '@angular/router';
import { GoogleSigninButtonModule, SocialAuthService } from '@abacritt/angularx-social-login';

@Component({
  selector: 'app-login.component',
  imports: [NavbarComponent, FormsModule, GoogleSigninButtonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  private googleLoginInProgress = false;

  constructor(
    private alertService: AlertService,
    private authService: AuthService,
    private router: Router,
    private socialAuthService: SocialAuthService
  ) {
    if (this.authService.IsAuthenticated())
      this.router.navigate(['/']);
  }

  ngOnInit() {
    this.socialAuthService.authState.subscribe((user) => {
      if (user && user.idToken && !this.googleLoginInProgress && !this.authService.IsAuthenticated()) {
        this.googleLoginInProgress = true;

        this.authService.LoginWithGoogle(user.idToken).subscribe({
          next: (res) => {
            if (res.needsRegistration && res.userData) {
              this.alertService.success('Completa la registrazione per continuare');
              this.router.navigate(['/register'], { state: { googleData: res.userData } });
            } else if (res.token) {
              this.alertService.success(res.message || 'Accesso Google completato!');
              this.authService.saveAuth(res.token);
              this.router.navigate(['/']);
            }
            this.googleLoginInProgress = false;
          },
          error: (error) => {
            this.alertService.error(error.error?.message || 'Errore durante l\'accesso con Google');
            this.googleLoginInProgress = false;
          }
        });
      }
    });
  }

  Login() {
    if (this.email == '' || this.password == '')
      return this.alertService.error("I campi email e password non possono essere vuoti !");

    this.authService.Login(this.email, this.password).subscribe({
      next: (res) => {
        if (res.token) {
          this.alertService.success(res.message || 'Login effettuato con successo !');
          this.authService.saveAuth(res.token);
          this.router.navigate(['/']);
        }
      },
      error: (error) => {
        this.alertService.error(error.error?.message || 'Errore durante il login');
      }
    })

  }
}
