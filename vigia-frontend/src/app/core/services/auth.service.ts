import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthResponse, LoginCredentials, RegisterCredentials, User, AuthState } from '../models/auth.model';

const API_URL = 'http://localhost:3001/auth';
const TOKEN_KEY = 'vigia_access_token';
const USER_KEY = 'vigia_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
  });

  authState$ = this.authState.asObservable();

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  private restoreSession(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);

    if (token && userJson) {
      try {
        const user: User = JSON.parse(userJson);
        this.authState.next({
          isAuthenticated: true,
          user,
          token,
        });
      } catch {
        this.clearSession();
      }
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/login`, credentials).pipe(
      tap((response) => {
        this.setSession(response.accessToken, response.user);
      }),
    );
  }

  register(credentials: RegisterCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/register`, credentials).pipe(
      tap((response) => this.setSession(response.accessToken, response.user)),
    );
  }

  private setSession(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.authState.next({
      isAuthenticated: true,
      user,
      token,
    });
  }

  logout(): void {
    this.clearSession();
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.authState.next({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated;
  }
}
