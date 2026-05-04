import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  isLoading = true;
  error: string | null = null;
  success = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      
      if (!token) {
        this.error = 'Token di verifica mancante.';
        this.isLoading = false;
        return;
      }

      this.verifyToken(token);
    });
  }

  private verifyToken(token: string): void {
    this.authService.VerifyEmail(token).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.success = true;
        
        // Salva il token e lo stato di autenticazione
        if (response.token) {
          this.authService.saveAuth(response.token);
        }

        // Reindirizza l'utente dopo un breve delay per mostrare il messaggio di successo
        setTimeout(() => {
          this.router.navigate(['/']); // O qualsiasi sia la rotta della dashboard/home
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Si è verificato un errore durante la verifica. Il link potrebbe essere scaduto.';
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
