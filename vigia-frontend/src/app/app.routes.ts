import { Routes } from '@angular/router';
import { isAuthenticatedGuard, isGuestGuard } from './core/guards/auth.guard.js';
import { LoginComponent } from './features/auth/login/login.component.js';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [isGuestGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component.js').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [isAuthenticatedGuard],
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];