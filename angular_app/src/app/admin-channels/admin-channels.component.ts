import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { RSSChannel } from '../models/types';

@Component({
  selector: 'app-admin-channels',
  templateUrl: './admin-channels.component.html',
  styleUrls: ['./admin-channels.component.css'],
  standalone: false
})
export class AdminChannelsComponent implements OnInit {
  channels: RSSChannel[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  newChannel: Partial<RSSChannel> = {
    name: '',
    url: ''
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadChannels();
  }

  loadChannels() {
    this.isLoading = true;
    this.apiService.getAllChannels().subscribe({
      next: (channels) => {
        this.channels = channels || [];
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Не удалось загрузить каналы';
        this.isLoading = false;
      }
    });
  }

  addChannel() {
    if (!this.newChannel.name || !this.newChannel.url) {
      this.errorMessage = 'Заполните все поля';
      return;
    }

    this.apiService.createChannel(this.newChannel as RSSChannel).subscribe({
      next: (channel) => {
        this.successMessage = `Канал "${channel.name}" добавлен`;
        this.newChannel = { name: '', url: '' };
        this.loadChannels();
      },
      error: (error) => {
        this.errorMessage = 'Не удалось добавить канал';
      }
    });
  }

  deleteChannel(channelName: string) {
    if (!confirm(`Удалить канал "${channelName}"?`)) {
      return;
    }

    // Нужно добавить метод deleteChannel в ApiService
    // this.apiService.deleteChannel(channelName).subscribe({
    //   next: () => {
    //     this.successMessage = `Канал "${channelName}" удален`;
    //     this.loadChannels();
    //   },
    //   error: (error) => {
    //     this.errorMessage = 'Не удалось удалить канал';
    //   }
    // });
    
    this.errorMessage = 'Функция удаления каналов пока не реализована';
  }
}