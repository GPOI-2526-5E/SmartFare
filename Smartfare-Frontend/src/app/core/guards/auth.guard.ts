import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';


export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.IsAuthenticated()) {
    return true;
  }

  console.log('⛔ Accesso negato: utente non autenticato');
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
