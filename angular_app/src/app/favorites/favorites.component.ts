import { Component, OnInit, HostListener } from '@angular/core';
import { ApiService } from '../services/api.service';
import { Article, RSSChannel } from '../models/types';

type SortOrder = 'newest' | 'oldest';
type PeriodFilter = 'all' | 'lastMonth' | 'lastYear' | 'previousYear';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css'],
  standalone: false
})
export class FavoritesComponent implements OnInit {
  articles: Article[] = [];
  userSubscriptions: RSSChannel[] = [];

  isLoading = false;
  errorMessage = '';

  searchQuery = '';
  selectedChannelIds: number[] = [];
  isChannelFilterOpen = false;
  sortOrder: SortOrder = 'newest';
  periodFilter: PeriodFilter = 'all';

  @HostListener('document:click', ['$event'])
  closeChannelFilterOnOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (!target.closest('.channel-multiselect')) {
      this.isChannelFilterOpen = false;
    }
  }

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadUserSubscriptions();
    this.loadArticles();
  }

  loadUserSubscriptions() {
    this.apiService.getUserSubscriptions().subscribe({
      next: (subscriptions) => {
        this.userSubscriptions = subscriptions || [];
      },
      error: (error) => {
        console.error('Ошибка загрузки подписок:', error);
        this.userSubscriptions = [];
      }
    });
  }

  loadArticles() {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getFavoriteArticles().subscribe({
      next: (articles) => {
        this.articles = articles || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки избранного:', error);
        this.errorMessage = 'Не удалось загрузить избранное';
        this.isLoading = false;
      }
    });
  }

  getChannels(): RSSChannel[] {
    return [...this.userSubscriptions]
      .filter(channel => channel.id !== undefined && channel.id !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  toggleChannelFilter(channelId: number | undefined) {
    if (!channelId) {
      return;
    }

    if (this.selectedChannelIds.includes(channelId)) {
      this.selectedChannelIds = this.selectedChannelIds.filter(id => id !== channelId);
    } else {
      this.selectedChannelIds = [...this.selectedChannelIds, channelId];
    }
  }

  isChannelSelected(channelId: number | undefined): boolean {
    if (!channelId) {
      return false;
    }

    return this.selectedChannelIds.includes(channelId);
  }

  clearChannelFilter() {
    this.selectedChannelIds = [];
  }

  getChannelFilterLabel(): string {
    if (this.selectedChannelIds.length === 0) {
      return 'Все каналы';
    }

    if (this.selectedChannelIds.length === 1) {
      const channel = this.userSubscriptions.find(c => c.id === this.selectedChannelIds[0]);
      return channel?.name || '1 канал';
    }

    return `Выбрано: ${this.selectedChannelIds.length}`;
  }

  getFilteredArticles(): Article[] {
    let result = [...this.articles];

    const query = this.searchQuery.trim().toLocaleLowerCase('ru-RU');

    if (query) {
      result = result.filter(article => {
        const title = (article.title || '').toLocaleLowerCase('ru-RU');
        const description = (article.description || '').toLocaleLowerCase('ru-RU');
        const channelName = (article.rssChannel?.name || '').toLocaleLowerCase('ru-RU');
        const url = (article.url || '').toLocaleLowerCase('ru-RU');

        return (
          title.includes(query) ||
          description.includes(query) ||
          channelName.includes(query) ||
          url.includes(query)
        );
      });
    }

    if (this.selectedChannelIds.length > 0) {
      result = result.filter(article =>
        this.selectedChannelIds.includes(article.rssChannelId)
      );
    }

    result = result.filter(article =>
      this.matchesPeriodFilter(article)
    );

    result.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();

      return this.sortOrder === 'newest'
        ? dateB - dateA
        : dateA - dateB;
    });

    return result;
  }

  matchesPeriodFilter(article: Article): boolean {
    if (this.periodFilter === 'all') {
      return true;
    }

    const published = new Date(article.publishedAt);
    const now = new Date();

    if (isNaN(published.getTime())) {
      return false;
    }

    if (this.periodFilter === 'lastMonth') {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      return published >= monthAgo;
    }

    if (this.periodFilter === 'lastYear') {
      const yearAgo = new Date();
      yearAgo.setFullYear(now.getFullYear() - 1);
      return published >= yearAgo;
    }

    if (this.periodFilter === 'previousYear') {
      return published.getFullYear() === now.getFullYear() - 1;
    }

    return true;
  }

  removeFromFavorites(article: Article) {
    this.apiService.removeArticleFromFavorites(article.id).subscribe({
      next: () => {
        this.articles = this.articles.filter(a => a.id !== article.id);
      },
      error: (error) => {
        console.error('Ошибка удаления из избранного:', error);
        this.errorMessage = 'Не удалось удалить статью из избранного';
      }
    });
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedChannelIds = [];
    this.isChannelFilterOpen = false;
    this.sortOrder = 'newest';
    this.periodFilter = 'all';
  }

  hasActiveFilters(): boolean {
    return (
      this.searchQuery.trim().length > 0 ||
      this.selectedChannelIds.length > 0 ||
      this.sortOrder !== 'newest' ||
      this.periodFilter !== 'all'
    );
  }

  openArticle(event: Event, article: Article) {
    event.preventDefault();
    window.open(article.url, '_blank', 'noopener,noreferrer');
  }

  trackArticle(index: number, article: Article): number {
    return article.id;
  }

  formatDate(dateString: string): string {
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
  }
}