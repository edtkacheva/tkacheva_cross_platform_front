import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { RSSChannel, CreateRSSChannelRequest } from '../models/types';

@Component({
  selector: 'app-channels',
  templateUrl: './channels.component.html',
  styleUrls: ['./channels.component.css'],
  standalone: false
})
export class ChannelsComponent implements OnInit {
  allChannels: RSSChannel[] = [];
  userSubscriptions: RSSChannel[] = [];
  newChannel: CreateRSSChannelRequest = { name: '', url: '' };

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isAdmin = false;

  showAddForm = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {
    console.log('ChannelsComponent: Конструктор вызван');
    console.log('Путь к компоненту: /channels');
  }

  ngOnInit() {
    console.log('ChannelsComponent: ngOnInit начат');
    console.log('Проверка пользователя...');

    this.isAdmin = this.authService.isUserAdmin();
    console.log('isAdmin:', this.isAdmin);
    console.log('isLoggedIn:', this.authService.isLoggedIn());
    console.log('Username:', this.authService.getUsername());

    this.loadData();
    console.log('ChannelsComponent: ngOnInit завершен');
  }

  loadData() {
    console.log('ChannelsComponent: Начинаю загрузку данных...');
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('Вызываю apiService.getAllChannels()');

    this.apiService.getAllChannels().subscribe({
      next: (channels) => {
        console.log('Каналы загружены успешно');
        console.log('Количество каналов:', channels?.length || 0);
        console.log('Данные каналов:', channels);

        this.allChannels = channels || [];

        if (!this.isAdmin) {
          console.log('Пользователь не админ, загружаю подписки...');
          this.loadUserSubscriptions();
        } else {
          console.log('Админ, пропускаю загрузку подписок');
          this.isLoading = false;
          console.log('Загрузка завершена (админ)');
        }
      },
      error: (error) => {
        console.error('Ошибка загрузки каналов:', error);
        console.error('Детали ошибки:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });

        this.errorMessage = 'Не удалось загрузить каналы';
        this.isLoading = false;
        console.log('Загрузка завершена с ошибкой');
      },
      complete: () => {
        console.log('Запрос getAllChannels завершен');
      }
    });
  }

  loadUserSubscriptions() {
    console.log('Загружаю подписки пользователя...');
    const username = this.authService.getUsername();
    console.log('Username для подписок:', username);

    if (username) {
      this.apiService.getUserSubscriptions().subscribe({
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
      console.warn('Username не найден, пропускаю загрузку подписок');
      this.userSubscriptions = [];
      this.isLoading = false;
      console.log('Загрузка завершена (без username)');
    }
  }

  isSubscribed(channelName: string): boolean {
    if (this.isAdmin) {
      console.log(`Админ, проверка подписки на "${channelName}": false (админ не подписывается)`);
      return false;
    }

    const isSubscribed = this.userSubscriptions.some(c => c.name === channelName);
    console.log(`Проверка подписки на "${channelName}":`, isSubscribed);
    console.log(`Текущие подписки:`, this.userSubscriptions.map(c => c.name));

    return isSubscribed;
  }

  subscribeToChannel(channel: RSSChannel) {
    const username = this.authService.getUsername();
    if (!channel.id) return;
  
    this.errorMessage = '';
    this.successMessage = '';
  
    this.apiService.subscribe(channel.id).subscribe({
      next: () => {
        this.successMessage = `Вы подписались на канал "${channel.name}"`;
        this.loadData();
      },
      error: (error) => {
        console.error('Ошибка подписки:', error);
        this.errorMessage =
          error?.error?.message ||
          error?.error ||
          'Не удалось подписаться на канал';
        this.loadData();
      }
    });
  }

  unsubscribeFromChannel(channel: RSSChannel) {
    const username = this.authService.getUsername();
    if (!channel.id) return;
  
    this.errorMessage = '';
    this.successMessage = '';
  
    this.apiService.unsubscribe(channel.id).subscribe({
      next: () => {
        this.successMessage = `Вы отписались от канала "${channel.name}"`;
        this.loadData();
      },
      error: (error) => {
        console.error('Ошибка отписки:', error);
        this.errorMessage =
          error?.error?.message ||
          error?.error ||
          'Не удалось отписаться от канала';
        this.loadData();
      }
    });
  }

  addNewChannel() {
    console.log('Пользователь добавляет новый канал:', this.newChannel);

    this.errorMessage = '';
    this.successMessage = '';

    const request: CreateRSSChannelRequest = {
      name: this.newChannel.name.trim(),
      url: this.newChannel.url.trim()
    };

    if (!request.name || !request.url) {
      console.warn('Не все поля заполнены');
      this.errorMessage = 'Заполните все поля';
      return;
    }

    console.log('Отправляю запрос на создание канала:', request);
    this.isLoading = true;

    this.apiService.createChannel(request).subscribe({
      next: (channel) => {
        console.log('Канал создан успешно:', channel);

        this.successMessage = this.isAdmin
          ? `Канал "${channel.name}" создан`
          : `Канал "${channel.name}" создан, вы подписаны на него, а статьи добавлены в непрочитанные`;

        this.newChannel = { name: '', url: '' };
        this.showAddForm = false;

        console.log('Обновляю список каналов...');
        this.loadData();
      },
      error: (error) => {
        console.error('Ошибка создания канала:', error);
        console.error('Детали ошибки создания канала:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });

        if (typeof error?.error === 'string' && error.error.trim()) {
          this.errorMessage = error.error;
        } else if (error?.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Не удалось создать канал';
        }

        this.isLoading = false;
      }
    });
  }

  deleteChannel(channel: any) {
    const id = channel.id ?? channel.Id;
    const name = channel.name ?? channel.Name ?? id;
  
    if (!id) {
      console.error('У канала нет id:', channel);
      this.errorMessage = 'Не удалось определить id канала для удаления';
      return;
    }
  
    if (!confirm(`Удалить канал "${name}"?`)) return;
  
    this.errorMessage = '';
    this.successMessage = '';
  
    this.apiService.deleteChannel(id).subscribe({
      next: () => {
        this.successMessage = 'Канал удалён';
        this.loadData();
      },
      error: (error) => {
        console.error('Ошибка удаления канала:', error);
        this.errorMessage =
          error?.error?.message ||
          error?.error ||
          'Не удалось удалить канал';
      }
    });
  }

  toggleAddForm() {
    console.log('Переключение формы добавления канала');
    console.log('Текущее состояние showAddForm:', this.showAddForm);

    this.showAddForm = !this.showAddForm;

    if (!this.showAddForm) {
      console.log('Форма скрыта, очищаю данные');
      this.newChannel = { name: '', url: '' };
      this.errorMessage = '';
      this.successMessage = '';
    }

    console.log('Новое состояние showAddForm:', this.showAddForm);
  }

  getAvailableChannels() {
    if (this.isAdmin) {
      console.log('Админ: показываю все каналы, количество:', this.allChannels.length);
      return this.allChannels;
    }

    const availableChannels = this.allChannels.filter(channel => !this.isSubscribed(channel.name));
    console.log('Пользователь: показываю доступные каналы, количество:', availableChannels.length);
    console.log('Доступные каналы:', availableChannels.map(c => c.name));

    return availableChannels;
  }
}