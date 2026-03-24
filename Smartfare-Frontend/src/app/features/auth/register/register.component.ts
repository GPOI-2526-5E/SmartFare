import { Component } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register.component',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  email: string = "";
  password: string = "";

  constructor(private alertService: AlertService, private authService: AuthService){}

  async Register() {
    if (this.email === "" || this.password === "") {
      this.alertService.show('Email e password sono obbligatori', 'danger');
      return;
    }
    try {
      const response = await this.authService.Register(this.email, this.password);
      if (response.success) {
        this.alertService.show('Registrazione effettuata con successo', 'info');
      } else if (!response.success) {
        this.alertService.show(response?.message, 'danger');
        console.log(response.message);
      }
    } catch (error: any) {
      this.alertService.show(error?.message || 'Errore durante la registrazione', 'danger');
      console.log(error.message);
    }
  }

}
