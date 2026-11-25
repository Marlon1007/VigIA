export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'auditor';
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
  role: User['role'];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}
