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
          
          // Декодируем токен для проверки роли
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

  isLoggedIn(): boolean {
    return this.hasToken();
  }

  isUserAdmin(): boolean {
    return localStorage.getItem('isAdmin') === 'true';
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
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
}