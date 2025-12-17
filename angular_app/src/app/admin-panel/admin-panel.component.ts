import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { User, RSSChannel } from '../models/types';

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css'],
  standalone: false
})
export class AdminPanelComponent implements OnInit {
  users: User[] = [];
  channels: RSSChannel[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  activeTab: 'users' | 'channels' = 'users';
  
  // Для создания нового канала
  newChannel: Partial<RSSChannel> = {
    name: '',
    url: '',
    articles: []
  };
  
  // Для создания нового пользователя
  newUser: User = {
    userName: '',
    password: '',
    isAdmin: false
  };

  constructor(
    private apiService: ApiService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    // Проверяем, что пользователь админ
    if (!this.authService.isUserAdmin()) {
      this.errorMessage = 'У вас нет прав администратора';
      return;
    }
    
    this.loadUsers();
    this.loadChannels();
  }

  loadUsers() {
    this.isLoading = true;
    this.apiService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки пользователей:', error);
        this.errorMessage = 'Не удалось загрузить пользователей';
        this.isLoading = false;
      }
    });
  }

  loadChannels() {
    this.isLoading = true;
    this.apiService.getAllChannels().subscribe({
      next: (channels) => {
        this.channels = channels || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки каналов:', error);
        this.errorMessage = 'Не удалось загрузить каналов';
        this.isLoading = false;
      }
    });
  }

  createChannel() {
    if (!this.newChannel.name || !this.newChannel.url) {
      this.errorMessage = 'Заполните все поля';
      return;
    }

    this.isLoading = true;
    this.apiService.createChannel(this.newChannel as RSSChannel).subscribe({
      next: (channel) => {
        this.successMessage = `Канал "${channel.name}" успешно создан`;
        this.newChannel = { name: '', url: '', articles: [] };
        this.loadChannels();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка создания канала:', error);
        this.errorMessage = 'Не удалось создать канал';
        this.isLoading = false;
      }
    });
  }

  deleteChannel(channelName: string) {
    if (!confirm(`Удалить канал "${channelName}"?`)) {
      return;
    }

    // Здесь нужен метод deleteChannel в ApiService
    // this.apiService.deleteChannel(channelName).subscribe({
    //   next: () => {
    //     this.successMessage = `Канал "${channelName}" удален`;
    //     this.loadChannels();
    //   },
    //   error: (error) => {
    //     console.error('Ошибка удаления канала:', error);
    //     this.errorMessage = 'Не удалось удалить канал';
    //   }
    // });
    
    // Временно показываем сообщение
    this.errorMessage = 'Метод удаления канала пока не реализован в API';
  }

  createUser() {
    if (!this.newUser.userName || !this.newUser.password) {
      this.errorMessage = 'Заполните все поля';
      return;
    }

    this.apiService.register(this.newUser).subscribe({
      next: (user) => {
        this.successMessage = `Пользователь "${user.userName}" создан`;
        this.newUser = { userName: '', password: '', isAdmin: false };
        this.loadUsers();
      },
      error: (error) => {
        console.error('Ошибка создания пользователя:', error);
        this.errorMessage = 'Не удалось создать пользователя';
      }
    });
  }

  deleteUser(username: string) {
    if (!confirm(`Удалить пользователя "${username}"?`)) {
      return;
    }

    // Здесь нужен метод deleteUser в ApiService
    // this.apiService.deleteUser(username).subscribe({
    //   next: () => {
    //     this.successMessage = `Пользователь "${username}" удален`;
    //     this.loadUsers();
    //   },
    //   error: (error) => {
    //     console.error('Ошибка удаления пользователя:', error);
    //     this.errorMessage = 'Не удалось удалить пользователя';
    //   }
    // });
    
    // Временно показываем сообщение
    this.errorMessage = 'Метод удаления пользователя пока не реализован в API';
  }

  setActiveTab(tab: 'users' | 'channels') {
    this.activeTab = tab;
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }
}