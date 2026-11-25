import { Component, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  hidePassword = signal(true);
  isRegistering = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  readonly loginForm = this.fb.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
  });

  toggleMode(): void {
    this.isRegistering.update((value) => !value);
    this.errorMessage.set(null);
    const name = this.loginForm.get('name');
    if (this.isRegistering()) {
      name?.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(100)]);
      this.loginForm.get('password')?.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(72)]);
    } else {
      name?.clearValidators();
      this.loginForm.get('password')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(72)]);
    }
    name?.updateValueAndValidity();
    this.loginForm.get('password')?.updateValueAndValidity();
  }

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigateByUrl('/dashboard');
      }
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const credentials = {
      email: this.loginForm.value.email!,
      password: this.loginForm.value.password!,
    };

    const request = this.isRegistering()
      ? this.authService.register({ ...credentials, name: this.loginForm.value.name!, role: 'operator' })
      : this.authService.login(credentials);
    request.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          (Array.isArray(err?.error?.message) ? err.error.message.join('. ') : err?.error?.message) ||
            (this.isRegistering() ? 'No se pudo crear la cuenta.' : 'Credenciales inválidas. Intenta de nuevo.'),
        );
      },
    });
  }

  get emailError(): string {
    const emailControl = this.loginForm.get('email');
    if (emailControl?.hasError('required')) {
      return 'El correo electrónico es obligatorio';
    }
    if (emailControl?.hasError('email')) {
      return 'Ingresa un correo válido';
    }
    return '';
  }

  get passwordError(): string {
    const passwordControl = this.loginForm.get('password');
    if (passwordControl?.hasError('required')) {
      return 'La contraseña es obligatoria';
    }
    if (passwordControl?.hasError('minlength')) {
      return `La contraseña debe tener al menos ${this.isRegistering() ? 8 : 6} caracteres`;
    }
    if (passwordControl?.hasError('maxlength')) return 'La contraseña no puede superar 72 caracteres';
    return '';
  }

  get nameError(): string {
    const control = this.loginForm.get('name');
    if (control?.hasError('required')) return 'El nombre es obligatorio';
    if (control?.hasError('minlength')) return 'Escribe al menos 2 caracteres';
    return '';
  }
}
