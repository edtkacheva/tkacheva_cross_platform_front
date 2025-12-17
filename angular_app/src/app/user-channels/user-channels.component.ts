import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { RSSChannel } from '../models/types';

@Component({
  selector: 'app-user-channels',
  templateUrl: './user-channels.component.html',
  styleUrls: ['./user-channels.component.css']
})
export class UserChannelsComponent implements OnInit {
  allChannels: RSSChannel[] = [];
  userSubscriptions: RSSChannel[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Для добавления нового канала
  newChannel: Partial<RSSChannel> = {
    name: '',
    url: ''
  };
  showAddForm = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    
    // Загружаем все каналы
    this.apiService.getAllChannels().subscribe({
      next: (channels) => {
        this.allChannels = channels || [];
        
        // Загружаем подписки пользователя
        const username = this.authService.getUsername();
        if (username) {
          this.apiService.getUserSubscriptions(username).subscribe({
            next: (subscriptions) => {
              this.userSubscriptions = subscriptions || [];
              this.isLoading = false;
            },
            error: (error) => {
              console.error('Ошибка загрузки подписок:', error);
              this.userSubscriptions = [];
              this.isLoading = false;
            }
          });
        } else {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Ошибка загрузки каналов:', error);
        this.errorMessage = 'Не удалось загрузить каналы';
        this.isLoading = false;
      }
    });
  }

  isSubscribed(channelName: string): boolean {
    return this.userSubscriptions.some(c => c.name === channelName);
  }

  subscribeToChannel(channelName: string) {
    const username = this.authService.getUsername();
    if (!username) return;

    this.apiService.subscribe(username, channelName).subscribe({
      next: () => {
        this.successMessage = `Подписались на канал "${channelName}"`;
        setTimeout(() => this.successMessage = '', 3000);
        this.loadData();
      },
      error: (error) => {
        this.errorMessage = 'Не удалось подписаться';
      }
    });
  }

  unsubscribeFromChannel(channelName: string) {
    const username = this.authService.getUsername();
    if (!username) return;

    this.apiService.unsubscribe(username, channelName).subscribe({
      next: () => {
        this.successMessage = `Отписались от канала "${channelName}"`;
        setTimeout(() => this.successMessage = '', 3000);
        this.loadData();
      },
      error: (error) => {
        this.errorMessage = 'Не удалось отписаться';
      }
    });
  }

  addNewChannel() {
    if (!this.newChannel.name || !this.newChannel.url) {
      this.errorMessage = 'Заполните все поля';
      return;
    }

    this.apiService.createChannel(this.newChannel as RSSChannel).subscribe({
      next: (channel) => {
        this.successMessage = `Канал "${channel.name}" создан и вы подписаны на него!`;
        this.newChannel = { name: '', url: '' };
        this.showAddForm = false;
        
        // Автоматически подписываемся на новый канал
        const username = this.authService.getUsername();
        if (username) {
          this.apiService.subscribe(username, channel.name).subscribe({
            next: () => {
              this.loadData();
            }
          });
        }
      },
      error: (error) => {
        this.errorMessage = 'Не удалось создать канал';
      }
    });
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.newChannel = { name: '', url: '' };
    }
  }
}