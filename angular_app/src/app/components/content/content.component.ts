import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { RSSChannel, Article } from '../../models/types';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css'],
  standalone: false
})
export class ContentComponent implements OnInit {
  articles: Article[] = [];
  userSubscriptions: RSSChannel[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  searchQuery = '';
  isAdmin = false;
  isSearchMode = false;

  constructor(
    private apiService: ApiService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    next: (channels) => {
      this.channelNameById = new Map(channels.map((c: any) => [c.id, c.name]));
    }
    this.isAdmin = this.authService.isUserAdmin();
    this.loadArticles();
    
    if (!this.isAdmin && this.authService.isLoggedIn()) {
      this.loadUserSubscriptions();
    }
  }

  loadArticles() {
    this.isLoading = true;
    this.apiService.getAllArticles().subscribe({
      next: (articles) => {
        this.articles = articles || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки статей:', error);
        this.errorMessage = 'Не удалось загрузить статьи';
        this.isLoading = false;
      }
    });
  }

  loadUserSubscriptions() {
    const username = this.authService.getUsername();
    if (username) {
      this.apiService.getUserSubscriptions(username).subscribe({
        next: (subscriptions) => {
          this.userSubscriptions = subscriptions || [];
        },
        error: (error) => {
          console.error('Ошибка загрузки подписок:', error);
        }
      });
    }
  }

  getFilteredArticles() {
    if (this.isSearchMode) {
      return this.articles;
    }
  
    // обычный режим: фильтр по подпискам
    if (!this.isAdmin && this.userSubscriptions.length > 0) {
      const subscribedChannelNames = this.userSubscriptions.map(c => c.name);
      return this.articles.filter(article =>
        article.rssChannel &&
        subscribedChannelNames.includes(article.rssChannel.name)
      );
    }
  
    return this.articles;
  }
  

  searchArticles() {
    const query = this.searchQuery.trim();
  
    if (!query) {
      this.isSearchMode = false;
      this.refreshData();
      return;
    }
  
    this.isSearchMode = true;
    this.isLoading = true;
  
    this.apiService.searchArticlesByDescription(query).subscribe({
      next: articles => {
        this.articles = articles;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Ошибка поиска статей';
        this.isLoading = false;
      }
    });
  }  

  clearSearch() {
    this.searchQuery = '';
    this.loadArticles();
  }

  refreshData() {
    this.loadArticles();
    if (!this.isAdmin) {
      this.loadUserSubscriptions();
    }
  }

  onSearchInput(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) 
        ? 'Неизвестная дата' 
        : date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
    } catch (error) {
      return 'Неизвестная дата';
    }
  }

  getChannelName(article: any): string {
    const fromObj = article?.rssChannel?.name;
    if (fromObj) return fromObj;
  
    const id = article?.rssChannelId;
    const fromMap = this.channelNameById?.get(id);
    if (fromMap) return fromMap;
  
    return 'Канал не найден';
  }

  channelNameById = new Map<number, string>();
}