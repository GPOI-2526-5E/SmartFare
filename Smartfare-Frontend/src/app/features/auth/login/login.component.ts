import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from "../../ui/navbar/navbar.component";
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login.component',
  imports: [NavbarComponent, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  constructor(private alertService: AlertService, private authService: AuthService, private router: Router) {
    if (this.authService.IsAuthenticated())
      this.router.navigate(['/']);
  }

  Login() {
    if (this.email == '' || this.password == '')
      return this.alertService.error("I campi email e password non possono essere vuoti !");

    this.authService.Login(this.email, this.password).subscribe({
      next: (res) => {
        this.alertService.success(res.message || 'Login effettuato con successo !');
        this.authService.saveAuth(res.token);
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.alertService.error(error.error.message);
      }
    })

  }
}
