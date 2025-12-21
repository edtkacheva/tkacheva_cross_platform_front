import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticated = new BehaviorSubject<boolean>(this.hasToken());
  private isAdmin = new BehaviorSubject<boolean>(this.checkAdmin());

  constructor(private apiService: ApiService, private router: Router) {}

  login(username: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.apiService.login(username, password).subscribe({
        next: (response) => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('username', username);
          
          const tokenData = this.decodeToken(response.token);
          const admin = tokenData['IsAdmin'] === 'true';
          
          localStorage.setItem('isAdmin', admin.toString());
          
          this.isAuthenticated.next(true);
          this.isAdmin.next(admin);
          
          this.router.navigate(['/']);
          resolve(true);
        },
        error: (error) => {
          console.error('Login error:', error);
          resolve(false);
        }
      });
    });
  }

  register(userData: any): Promise<boolean> {
    return new Promise((resolve) => {
      this.apiService.register(userData).subscribe({
        next: () => {
          this.login(userData.userName, userData.password).then(resolve);
        },
        error: (error) => {
          console.error('Registration error:', error);
          resolve(false);
        }
      });
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    this.isAuthenticated.next(false);
    this.isAdmin.next(false);
    this.router.navigate(['/login']);
  }

  getAuthStatus() {
    return this.isAuthenticated.asObservable();
  }

  getAdminStatus() {
    return this.isAdmin.asObservable();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  private checkAdmin(): boolean {
    return localStorage.getItem('isAdmin') === 'true';
  }

  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (e) {
      return {};
    }
  }

getToken(): string | null {
  return localStorage.getItem('token');
}

private decodeJwtPayload(token: string): any | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

getUsername(): string {
  const token = this.getToken();
  if (!token) return '';

  const payload = this.decodeJwtPayload(token);
  if (!payload) return '';

  return (
    payload['unique_name'] ||
    payload['name'] ||
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
    ''
  );
}

isLoggedIn(): boolean {
  return !!this.getToken();
}

isUserAdmin(): boolean {
  const token = this.getToken();
  if (!token) return false;

  const payload = this.decodeJwtPayload(token);
  if (!payload) return false;

  const roleValue =
    payload['role'] ||
    payload['roles'] ||
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

  if (Array.isArray(roleValue)) {
    return roleValue.includes('Admin');
  }

  return roleValue === 'Admin';
}

}