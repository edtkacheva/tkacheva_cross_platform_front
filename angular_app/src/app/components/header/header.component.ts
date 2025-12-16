import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: false
})
export class HeaderComponent implements OnInit {
  isLoggedIn = false;
  isAdmin = false;
  username: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.getAuthStatus().subscribe(status => {
      this.isLoggedIn = status;
      this.username = this.authService.getUsername();
    });

    this.authService.getAdminStatus().subscribe(status => {
      this.isAdmin = status;
    });
  }

  logout() {
    this.authService.logout();
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}