import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  private routerSubscription: Subscription;
  
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Подписываемся на изменения маршрута для обновления статуса
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Принудительно обновляем статус при смене маршрута
        console.log('Route changed, auth status:', {
          isLoggedIn: this.isLoggedIn,
          isAdmin: this.isAdmin,
          username: this.getUsername()
        });
      }
    });
  }

  ngOnDestroy(): void {
    // Отписываемся при уничтожении компонента
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get isAdmin(): boolean {
    return this.authService.isUserAdmin();
  }

  getUsername(): string {
    return this.authService.getUsername() || '';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}