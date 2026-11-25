// Guard to protect routes based on authentication status
// Uses Angular Router's parseUrl to return a UrlTree for redirection.

import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const isAuthenticatedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isAuthenticated()) {
    return true;
  }
  // Redirect to login page
  return router.parseUrl('/login');
};

export const isGuestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isAuthenticated()) {
    return true;
  }
  // Redirect authenticated users to dashboard
  return router.parseUrl('/dashboard');
};
