import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { RSSChannel, Article } from '../../models/types';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

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
  channelNameById = new Map<number, string>(); 

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.isAdmin = this.authService.isUserAdmin();
    this.loadArticles();

    if (!this.isAdmin && this.authService.isLoggedIn()) {
      this.loadUserSubscriptions();
    }
  }

  loadArticles() {
    this.isLoading = true;
    this.errorMessage = '';

    if (this.isAdmin) {
      this.apiService.getAllArticles().subscribe({
        next: (articles) => {
          console.log('Статьи загружены:', articles);
          this.articles = articles || [];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Ошибка загрузки статей:', error);
          this.errorMessage = 'Не удалось загрузить статьи';
          this.isLoading = false;
        }
      });
      return;
    }

    const username = this.authService.getUsername();
    if (!username) {
      this.errorMessage = 'Пользователь не найден';
      this.isLoading = false;
      return;
    }

    this.apiService.getUnreadArticles(username).subscribe({
      next: (articles) => {
        console.log('Загруженные статьи:', articles);
        this.articles = articles || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки непрочитанных статей:', error);
        this.errorMessage = 'Не удалось загрузить непрочитанные статьи';
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

  getUnreadArticles() {
    return this.articles.filter(a => !a.isRead);
  }

  getReadArticles() {
    return this.articles.filter(a => a.isRead);
  }

  openArticle(event: Event, article: any): void {
    event.preventDefault();
  
    this.apiService.markArticleAsRead(article.id).subscribe({
      next: () => {
        console.log('Статья отмечена как прочитанная на сервере');
  
        article.isRead = true;
        this.articles = [...this.articles];
  
        window.open(article.url, '_blank', 'noopener,noreferrer');
      },
      error: (error) => {
        console.error('Ошибка при отметке статьи как прочитанной:', error);
  
        window.open(article.url, '_blank', 'noopener,noreferrer');
      }
    });
  }

  getFilteredArticles() {
    if (this.isSearchMode) {
      return this.articles;
    }
  
    if (!this.isAdmin && this.userSubscriptions.length > 0) {
      const subscribedChannelNames = this.userSubscriptions.map(c => c.name);
      console.log('Подписки пользователя:', subscribedChannelNames);
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
    this.errorMessage = '';

    this.apiService.searchArticlesByDescription(query).subscribe({
      next: (articles) => {
        this.articles = articles || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка поиска статей:', error);
        this.errorMessage = 'Ошибка поиска статей';
        this.isLoading = false;
      }
    });
  }

  clearSearch() {
    this.searchQuery = '';
    this.isSearchMode = false;
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

  goBack() {
    // Проверяем, чтобы статьи были обновлены после перехода
    this.articles = [...this.articles]; // Триггерим перерисовку массива
  }
}