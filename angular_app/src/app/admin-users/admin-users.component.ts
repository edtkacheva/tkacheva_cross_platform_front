import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { User } from '../models/types';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css'],
  standalone: false
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.errorMessage = '';
  
    this.apiService.getAllUsers().subscribe({
      next: (users) => {
        this.users = (users || []).filter(u => u.id !== 1);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Не удалось загрузить пользователей';
        this.isLoading = false;
      }
    });
  }

  openSubscriptionsUserId: number | null = null;

  toggleSubscriptions(userId: number) {
    this.openSubscriptionsUserId =
      this.openSubscriptionsUserId === userId ? null : userId;
  }

  isSubscriptionsOpen(userId: number): boolean {
    return this.openSubscriptionsUserId === userId;
  }

  getVisibleSubscriptions(user: any) {
    return (user.subscribedChannels || []).slice(0, 2);
  }
  

  deleteUser(user: User) {
    if (!user.id) {
      this.errorMessage = 'Не удалось определить id пользователя';
      return;
    }
  
    if (!confirm(`Удалить пользователя "${user.userName}"?`)) {
      return;
    }
  
    this.errorMessage = '';
    this.successMessage = '';
  
    this.apiService.deleteUser(user.id).subscribe({
      next: () => {
        this.successMessage = 'Пользователь удалён';
        this.loadUsers();
      },
      error: (error) => {
        console.error('Ошибка удаления пользователя:', error);
  
        this.errorMessage =
          error?.error?.message ||
          error?.error ||
          'Не удалось удалить пользователя';
      }
    });
  }
  
}