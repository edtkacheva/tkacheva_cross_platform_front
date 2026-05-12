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

  newChannel: CreateRSSChannelRequest = {
    name: '',
    url: ''
  };

  channelSearchQuery = '';

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isAdmin = false;
  showAddForm = false;

  editingChannelId: number | null = null;

  editChannel: CreateRSSChannelRequest = {
    name: '',
    url: ''
  };

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.isAdmin = this.authService.isUserAdmin();
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.getAllChannels().subscribe({
      next: (channels) => {
        this.allChannels = channels || [];

        if (this.isAdmin) {
          this.isLoading = false;
          return;
        }

        this.loadUserSubscriptions();
      },
      error: (error) => {
        console.error('Ошибка загрузки каналов:', error);
        this.errorMessage = 'Не удалось загрузить каналы';
        this.isLoading = false;
      }
    });
  }

  loadUserSubscriptions() {
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
  }

  subscribeToChannel(channel: RSSChannel) {
    if (!channel.id) {
      this.errorMessage = 'Не удалось определить id канала';
      return;
    }

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
    if (!channel.id) {
      this.errorMessage = 'Не удалось определить id канала';
      return;
    }

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
    this.errorMessage = '';
    this.successMessage = '';

    const request: CreateRSSChannelRequest = {
      name: this.newChannel.name.trim(),
      url: this.newChannel.url.trim()
    };

    if (!request.name || !request.url) {
      this.errorMessage = 'Заполните название и RSS URL';
      return;
    }

    this.isLoading = true;

    this.apiService.createChannel(request).subscribe({
      next: (channel) => {
        this.successMessage = this.isAdmin
          ? `Канал "${channel.name}" создан`
          : `Канал "${channel.name}" создан, вы подписаны на него`;

        this.newChannel = {
          name: '',
          url: ''
        };

        this.showAddForm = false;
        this.loadData();
      },
      error: (error) => {
        console.error('Ошибка создания канала:', error);

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

  deleteChannel(channel: RSSChannel) {
    const id = channel.id;
    const name = channel.name || id;

    if (!id) {
      this.errorMessage = 'Не удалось определить id канала для удаления';
      return;
    }

    if (!confirm(`Удалить канал "${name}"?`)) {
      return;
    }

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
    this.showAddForm = !this.showAddForm;

    if (!this.showAddForm) {
      this.newChannel = {
        name: '',
        url: ''
      };

      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  onChannelSearchInput(event: Event) {
    this.channelSearchQuery = (event.target as HTMLInputElement).value;
  }

  clearChannelSearch() {
    this.channelSearchQuery = '';
  }

  private normalize(value: string | null | undefined): string {
    return (value || '')
      .trim()
      .toLocaleLowerCase('ru-RU');
  }

  private matchesChannelSearch(channel: RSSChannel): boolean {
    const query = this.normalize(this.channelSearchQuery);

    if (!query) {
      return true;
    }

    const name = this.normalize(channel.name);
    const url = this.normalize(channel.url);

    return name.includes(query) || url.includes(query);
  }

  private isSubscribed(channel: RSSChannel): boolean {
    if (!channel.id) {
      return this.userSubscriptions.some(
        subscription => subscription.name === channel.name
      );
    }

    return this.userSubscriptions.some(
      subscription => subscription.id === channel.id
    );
  }

  getFilteredUserSubscriptions(): RSSChannel[] {
    return this.userSubscriptions.filter(channel =>
      this.matchesChannelSearch(channel)
    );
  }

  getAvailableChannels(): RSSChannel[] {
    return this.allChannels
      .filter(channel => !this.isSubscribed(channel))
      .filter(channel => this.matchesChannelSearch(channel));
  }

  getFilteredAllChannels(): RSSChannel[] {
    return this.allChannels.filter(channel =>
      this.matchesChannelSearch(channel)
    );
  }

  hasSearchQuery(): boolean {
    return this.channelSearchQuery.trim().length > 0;
  }

  startEditChannel(channel: RSSChannel) {
    if (!channel.id) {
      this.errorMessage = 'Не удалось определить id канала';
      return;
    }
  
    this.editingChannelId = channel.id;
  
    this.editChannel = {
      name: channel.name,
      url: channel.url
    };
  
    this.errorMessage = '';
    this.successMessage = '';
  }
  
  cancelEditChannel() {
    this.editingChannelId = null;
  
    this.editChannel = {
      name: '',
      url: ''
    };
  }
  
  saveChannelChanges(channel: RSSChannel) {
    if (!channel.id) {
      this.errorMessage = 'Не удалось определить id канала';
      return;
    }
  
    const request: CreateRSSChannelRequest = {
      name: this.editChannel.name.trim(),
      url: this.editChannel.url.trim()
    };
  
    const validationError = this.getEditValidationError(channel.id, request);
  
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }
  
    this.errorMessage = '';
    this.successMessage = '';
  
    this.apiService.updateChannel(channel.id, request).subscribe({
      next: () => {
        this.successMessage = 'Канал обновлён';
        this.cancelEditChannel();
        this.loadData();
      },
      error: (error) => {
        console.error('Ошибка редактирования канала:', error);
  
        this.errorMessage =
          error?.error?.message ||
          error?.error ||
          'Не удалось обновить канал';
      }
    });
  }

  private normalizeForCompare(value: string | null | undefined): string {
    return (value || '')
      .trim()
      .toLocaleLowerCase('ru-RU')
      .replace(/\/+$/, '');
  }
  
  private isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
  
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        !!url.hostname
      );
    } catch {
      return false;
    }
  }
  
  private getEditValidationError(channelId: number, request: CreateRSSChannelRequest): string {
    const name = request.name.trim();
    const url = request.url.trim();
  
    if (!name) {
      return 'Название канала не может быть пустым';
    }
  
    if (!url) {
      return 'RSS URL не может быть пустым';
    }
  
    if (!this.isValidHttpUrl(url)) {
      return 'Введите корректный RSS URL. Например: https://example.com/rss.xml';
    }
  
    const normalizedName = this.normalizeForCompare(name);
    const normalizedUrl = this.normalizeForCompare(url);
  
    const sameNameExists = this.allChannels.some(channel =>
      channel.id !== channelId &&
      this.normalizeForCompare(channel.name) === normalizedName
    );
  
    if (sameNameExists) {
      return 'Канал с таким названием уже существует';
    }
  
    const sameUrlExists = this.allChannels.some(channel =>
      channel.id !== channelId &&
      this.normalizeForCompare(channel.url) === normalizedUrl
    );
  
    if (sameUrlExists) {
      return 'Канал с таким RSS URL уже существует';
    }
  
    return '';
  }
}