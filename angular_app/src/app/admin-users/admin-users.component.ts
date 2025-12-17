import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { User } from '../models/types';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
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
    this.apiService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users || [];
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Не удалось загрузить пользователей';
        this.isLoading = false;
      }
    });
  }

  deleteUser(username: string) {
    if (!confirm(`Удалить пользователя "${username}"?`)) {
      return;
    }

    // Нужно добавить метод deleteUser в ApiService
    // this.apiService.deleteUser(username).subscribe({
    //   next: () => {
    //     this.successMessage = `Пользователь "${username}" удален`;
    //     this.loadUsers();
    //   },
    //   error: (error) => {
    //     this.errorMessage = 'Не удалось удалить пользователя';
    //   }
    // });
    
    this.errorMessage = 'Функция удаления пользователей пока не реализована';
  }
}