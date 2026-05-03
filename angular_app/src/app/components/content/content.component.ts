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
  favoriteArticles: Article[] = [];
  showFavoritesOnly = false;

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
  
      if (typeof this.loadFavoriteArticles === 'function') {
        this.loadFavoriteArticles();
      }
    }
  
    this.refreshRssInBackground();
  }

  loadFavoriteArticles() {
    this.apiService.getFavoriteArticles().subscribe({
      next: (articles) => {
        this.favoriteArticles = articles || [];
      },
      error: (error) => {
        console.error('Ошибка загрузки избранного:', error);
        this.favoriteArticles = [];
      }
    });
  }

  refreshRssInBackground() {
    this.apiService.refreshRssArticles().subscribe({
      next: (result) => {
        console.log('RSS обновлены:', result);
  
        this.loadArticles();
  
        if (!this.isAdmin && this.authService.isLoggedIn()) {
          this.loadUserSubscriptions();
  
          if (typeof this.loadFavoriteArticles === 'function') {
            this.loadFavoriteArticles();
          }
        }
      },
      error: (error) => {
        console.error('Ошибка фонового обновления RSS:', error);
      }
    });
  }
  
  toggleFavoritesView() {
    this.showFavoritesOnly = !this.showFavoritesOnly;
  
    if (this.showFavoritesOnly) {
      this.loadFavoriteArticles();
    }
  }
  
  getCurrentArticles() {
    return this.showFavoritesOnly ? this.favoriteArticles : this.articles;
  }
  
  getUnreadArticles() {
    return this.getCurrentArticles().filter(a => !a.isRead);
  }
  
  getReadArticles() {
    return this.getCurrentArticles().filter(a => a.isRead);
  }
  
  toggleFavorite(article: Article) {
    const shouldBeFavorite = !article.isFavorite;
  
    const request = shouldBeFavorite
      ? this.apiService.addArticleToFavorites(article.id)
      : this.apiService.removeArticleFromFavorites(article.id);
  
    request.subscribe({
      next: () => {
        article.isFavorite = shouldBeFavorite;
  
        this.articles = this.articles.map(a =>
          a.id === article.id
            ? { ...a, isFavorite: shouldBeFavorite }
            : a
        );
  
        if (shouldBeFavorite) {
          const exists = this.favoriteArticles.some(a => a.id === article.id);
  
          if (!exists) {
            this.favoriteArticles = [
              { ...article, isFavorite: true },
              ...this.favoriteArticles
            ];
          }
        } else {
          this.favoriteArticles = this.favoriteArticles
            .filter(a => a.id !== article.id);
        }
      },
      error: (error) => {
        console.error('Ошибка изменения избранного:', error);
        this.errorMessage = 'Не удалось изменить избранное';
      }
    });
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

    this.apiService.getMyArticles().subscribe({
      next: (articles) => {
        this.articles = articles || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки статей пользователя:', error);
        this.errorMessage = 'Не удалось загрузить статьи';
        this.isLoading = false;
      }
    });
  }

  refreshRssAndLoadArticles() {
    this.isLoading = true;
    this.errorMessage = '';
  
    this.apiService.refreshRssArticles().subscribe({
      next: () => {
        this.loadArticles();
  
        if (!this.isAdmin && this.authService.isLoggedIn()) {
          this.loadUserSubscriptions();
        }
      },
      error: (error) => {
        console.error('Ошибка обновления RSS-каналов:', error);
  
        this.loadArticles();
  
        if (!this.isAdmin && this.authService.isLoggedIn()) {
          this.loadUserSubscriptions();
        }
      }
    });
  }
  
  loadUserSubscriptions() {
    const username = this.authService.getUsername();
    this.apiService.getUserSubscriptions().subscribe({
      next: (subscriptions) => {
        this.userSubscriptions = subscriptions || [];
      },
      error: (error) => {
        console.error('Ошибка загрузки подписок:', error);
      }
    });
  }

  openArticle(event: Event, article: any): void {
    event.preventDefault();
  
    this.apiService.markArticleAsRead(article.id).subscribe({
      next: () => {
        console.log('Статья отмечена как прочитанная на сервере');
  
        article.isRead = true;
        this.articles = [...this.articles];

        this.favoriteArticles = this.favoriteArticles.map(a =>
          a.id === article.id
            ? { ...a, isRead: true }
            : a
        );
  
        window.open(article.url, '_blank', 'noopener,noreferrer');
      },
      error: (error) => {
        console.error('Ошибка при отметке статьи как прочитанной:', error);
  
        window.open(article.url, '_blank', 'noopener,noreferrer');
      }
    });
  }

  trackArticle(index: number, article: Article): number {
    return article.id;
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
      if (!dateString) {
        return 'Неизвестная дата';
      }
  
      const hasTimezone =
        dateString.endsWith('Z') ||
        /[+-]\d{2}:\d{2}$/.test(dateString);
  
      const normalizedDateString = hasTimezone
        ? dateString
        : `${dateString}Z`;
  
      const date = new Date(normalizedDateString);
  
      if (isNaN(date.getTime())) {
        return 'Неизвестная дата';
      }
  
      const time = date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
  
      const day = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
  
      return `${time} ${day}`;
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