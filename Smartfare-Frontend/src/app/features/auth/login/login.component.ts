import { Component } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login.component',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {

  email:string = '';
  password: string = '';

  constructor(private authService: AuthService, router: Router){}

  async Login() {
    if (this.email === "" || this.password === "") {
      //this.alertService.show('Email e password sono obbligatori', 'danger');
      return;
    }

    try {
      const response = await this.authService.Login(this.email, this.password);
      if (response.success) {
        //this.alertService.show('Login effettuato con successo', 'info');
        console.log("Login Effettuato !");
      } else if (!response.success) {
        //this.alertService.show(response?.message || 'Credenziali non valide', 'danger');
        console.log(response.message);
      }
    } catch (error: any) {
      //this.alertService.show(error?.message || 'Errore durante il login', 'danger');
      console.log(error.message);
    }
  }
}
