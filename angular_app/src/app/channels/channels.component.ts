import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { RSSChannel } from '../models/types';

@Component({
  selector: 'app-channels',
  templateUrl: './channels.component.html',
  styleUrls: ['./channels.component.css'],
  standalone: false
})
export class ChannelsComponent implements OnInit {
  allChannels: RSSChannel[] = [];
  userSubscriptions: RSSChannel[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isAdmin = false;
  
  // Для добавления нового канала
  newChannel = {
    name: '',
    url: ''
  };
  showAddForm = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {
    console.log('🚀 ChannelsComponent: Конструктор вызван');
    console.log('📍 Путь к компоненту: /channels');
  }

  ngOnInit() {
    console.log('🔄 ChannelsComponent: ngOnInit начат');
    console.log('👤 Проверка пользователя...');
    
    this.isAdmin = this.authService.isUserAdmin();
    console.log('👑 isAdmin:', this.isAdmin);
    console.log('🔐 isLoggedIn:', this.authService.isLoggedIn());
    console.log('👤 Username:', this.authService.getUsername());
    
    this.loadData();
    console.log('✅ ChannelsComponent: ngOnInit завершен');
  }

  loadData() {
    console.log('📡 ChannelsComponent: Начинаю загрузку данных...');
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    console.log('📡 Вызываю apiService.getAllChannels()');
    
    this.apiService.getAllChannels().subscribe({
      next: (channels) => {
        console.log('✅ Каналы загружены успешно');
        console.log('📊 Количество каналов:', channels?.length || 0);
        console.log('📝 Данные каналов:', channels);
        
        this.allChannels = channels || [];
        
        // Если не админ - загружаем подписки
        if (!this.isAdmin) {
          console.log('👤 Пользователь не админ, загружаю подписки...');
          this.loadUserSubscriptions();
        } else {
          console.log('👑 Админ, пропускаю загрузку подписок');
          this.isLoading = false;
          console.log('✅ Загрузка завершена (админ)');
        }
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки каналов:', error);
        console.error('📊 Детали ошибки:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        
        this.errorMessage = 'Не удалось загрузить каналы';
        this.isLoading = false;
        console.log('❌ Загрузка завершена с ошибкой');
      },
      complete: () => {
        console.log('🏁 Запрос getAllChannels завершен');
      }
    });
  }

  loadUserSubscriptions() {
    console.log('📡 Загружаю подписки пользователя...');
    const username = this.authService.getUsername();
    console.log('👤 Username для подписок:', username);
    
    if (username) {
      this.apiService.getUserSubscriptions(username).subscribe({
        next: (subscriptions) => {
          console.log('✅ Подписки загружены');
          console.log('📊 Количество подписок:', subscriptions?.length || 0);
          console.log('📝 Данные подписок:', subscriptions);
          
          this.userSubscriptions = subscriptions || [];
          this.isLoading = false;
          console.log('✅ Загрузка завершена (пользователь)');
        },
        error: (error) => {
          console.error('❌ Ошибка загрузки подписок:', error);
          this.userSubscriptions = [];
          this.isLoading = false;
          console.log('⚠️ Загрузка завершена, подписки очищены');
        }
      });
    } else {
      console.warn('⚠️ Username не найден, пропускаю загрузку подписок');
      this.userSubscriptions = [];
      this.isLoading = false;
      console.log('✅ Загрузка завершена (без username)');
    }
  }

  isSubscribed(channelName: string): boolean {
    if (this.isAdmin) {
      console.log(`👑 Админ, проверка подписки на "${channelName}": false (админ не подписывается)`);
      return false;
    }
    
    const isSubscribed = this.userSubscriptions.some(c => c.name === channelName);
    console.log(`🔍 Проверка подписки на "${channelName}":`, isSubscribed);
    console.log(`📋 Текущие подписки:`, this.userSubscriptions.map(c => c.name));
    
    return isSubscribed;
  }

  subscribeToChannel(channelName: string) {
    const username = this.authService.getUsername();
    if (!username) return;
  
    this.apiService.subscribe(username, channelName).subscribe({
      next: () => {
        this.successMessage = 'Вы успешно подписались на канал';
        this.loadData(); // обновляем каналы
      },
      error: () => {
        this.loadData();
      }
    });
  }

  unsubscribeFromChannel(channelName: string) {
    const username = this.authService.getUsername();
    if (!username) return;
  
    this.apiService.unsubscribe(username, channelName).subscribe({
      next: () => {
        this.successMessage = 'Вы отписались от канала';
        this.loadData();
      },
      error: () => {
        this.loadData();
      }
    });
  }
  

  addNewChannel() {
    console.log('📝 Пользователь добавляет новый канал:', this.newChannel);
    
    if (!this.newChannel.name || !this.newChannel.url) {
      console.warn('❌ Не все поля заполнены');
      this.errorMessage = 'Заполните все поля';
      return;
    }

    console.log('📡 Отправляю запрос на создание канала:', this.newChannel);

    this.apiService.createChannel(this.newChannel).subscribe({
      next: (channel) => {
        console.log('✅ Канал создан успешно:', channel);
        this.successMessage = `Канал "${channel.name}" создан`;
        
        this.newChannel = { name: '', url: '' };
        this.showAddForm = false;
        
        console.log('🔄 Обновляю список каналов...');
        this.loadData();
        
        // Если не админ - автоматически подписываемся
        if (!this.isAdmin) {
          const username = this.authService.getUsername();
          if (username) {
            console.log(`👤 Автоподписка пользователя ${username} на новый канал ${channel.name}`);
            this.apiService.subscribe(username, channel.name).subscribe({
              next: () => {
                console.log('✅ Автоподписка успешна');
                this.successMessage += ' и вы подписаны на него!';
                this.loadUserSubscriptions();
              },
              error: (error) => {
                console.error('❌ Ошибка автоподписки:', error);
              }
            });
          }
        }
      },
      error: (error) => {
        console.error('❌ Ошибка создания канала:', error);
        this.errorMessage = 'Не удалось создать канал';
      }
    });
  }

  deleteChannel(name: string) {
    if (!confirm(`Удалить канал "${name}"?`)) return;
  
    this.apiService.deleteChannel(name).subscribe({
      next: () => {
        this.successMessage = 'Канал удалён';
        this.loadData();
      },
      error: () => {
        this.loadData();
      }
    });
  }

  toggleAddForm() {
    console.log('🔄 Переключение формы добавления канала');
    console.log('📊 Текущее состояние showAddForm:', this.showAddForm);
    
    this.showAddForm = !this.showAddForm;
    
    if (!this.showAddForm) {
      console.log('🗑️ Форма скрыта, очищаю данные');
      this.newChannel = { name: '', url: '' };
    }
    
    console.log('📊 Новое состояние showAddForm:', this.showAddForm);
  }

  // Для админа - все каналы, для пользователя - только не подписанные
  getAvailableChannels() {
    if (this.isAdmin) {
      console.log('👑 Админ: показываю все каналы, количество:', this.allChannels.length);
      return this.allChannels;
    }
    
    const availableChannels = this.allChannels.filter(channel => !this.isSubscribed(channel.name));
    console.log('👤 Пользователь: показываю доступные каналы, количество:', availableChannels.length);
    console.log('📋 Доступные каналы:', availableChannels.map(c => c.name));
    
    return availableChannels;
  }
}