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

  constructor(
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
    if (!this.isAdmin && this.userSubscriptions.length > 0) {
      const subscribedChannelNames = this.userSubscriptions.map(c => c.name);
      return this.articles.filter(article => 
        article.rSSChannel && subscribedChannelNames.includes(article.rSSChannel.name)
      );
    }
    return this.articles;
  }

  searchArticles() {
    if (!this.searchQuery.trim()) {
      this.errorMessage = 'Пожалуйста, введите текст для поиска';
      return;
    }

    this.isLoading = true;
    this.apiService.searchArticlesByDescription(this.searchQuery).subscribe({
      next: (articles) => {
        this.articles = articles;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Не удалось найти статьи';
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

  getChannelName(article: Article): string {
    return article.rSSChannel?.name || 'Неизвестный канал';
  }
}