import { Component, OnInit } from '@angular/core';
import { ApiService, ArticleFilterParams } from '../services/api.service';
import { Article, RSSChannel } from '../models/types';

type SortOrder = 'newest' | 'oldest';
type PeriodFilter = 'all' | 'lastMonth' | 'lastYear' | 'previousYear';

@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.css'],
  standalone: false
})
export class ArchiveComponent implements OnInit {
  articles: Article[] = [];
  userSubscriptions: RSSChannel[] = [];

  isLoading = false;
  isLoadingMore = false;
  errorMessage = '';

  page = 1;
  pageSize = 20;
  hasMoreArticles = true;

  searchQuery = '';
  selectedChannelIds: number[] = [];
  isChannelFilterOpen = false;
  sortOrder: SortOrder = 'newest';
  periodFilter: PeriodFilter = 'all';

  private searchDebounceId?: ReturnType<typeof setTimeout>;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadUserSubscriptions();
    this.loadArticles(true);
  }

  ngOnDestroy() {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }
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

  loadArticles(reset: boolean = false) {
    if (this.isLoadingMore) {
      return;
    }

    if (reset) {
      this.page = 1;
      this.articles = [];
      this.hasMoreArticles = true;
      this.isLoading = true;
    } else {
      if (!this.hasMoreArticles) {
        return;
      }

      this.isLoadingMore = true;
    }

    this.errorMessage = '';

    this.apiService.getMyReadArticles(
      this.page,
      this.pageSize,
      this.getCurrentFilters()
    ).subscribe({
      next: (articles) => {
        const loaded = articles || [];

        const existingIds = new Set(this.articles.map(a => a.id));
        const uniqueLoaded = loaded.filter(a => !existingIds.has(a.id));

        this.articles = reset
          ? loaded
          : [...this.articles, ...uniqueLoaded];

        this.hasMoreArticles = loaded.length === this.pageSize;

        if (this.hasMoreArticles) {
          this.page++;
        }

        this.isLoading = false;
        this.isLoadingMore = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки архива:', error);
        this.errorMessage = 'Не удалось загрузить архив';
        this.isLoading = false;
        this.isLoadingMore = false;
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

    this.applyFilters();
  }

  isChannelSelected(channelId: number | undefined): boolean {
    if (!channelId) {
      return false;
    }

    return this.selectedChannelIds.includes(channelId);
  }

  clearChannelFilter() {
    this.selectedChannelIds = [];
    this.applyFilters();
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

  getCurrentFilters(): ArticleFilterParams {
    return {
      search: this.searchQuery,
      channelIds: this.selectedChannelIds,
      sortOrder: this.sortOrder,
      periodFilter: this.periodFilter
    };
  }

  applyFilters() {
    this.loadArticles(true);
  }

  onSearchChanged() {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }

    this.searchDebounceId = setTimeout(() => {
      this.applyFilters();
    }, 400);
  }

  getFilteredArticles(): Article[] {
    return this.articles;
  }

  hasActiveFilters(): boolean {
    return (
      this.searchQuery.trim().length > 0 ||
      this.selectedChannelIds.length > 0 ||
      this.sortOrder !== 'newest' ||
      this.periodFilter !== 'all'
    );
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedChannelIds = [];
    this.isChannelFilterOpen = false;
    this.sortOrder = 'newest';
    this.periodFilter = 'all';

    this.applyFilters();
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
      },
      error: (error) => {
        console.error('Ошибка изменения избранного:', error);
        this.errorMessage = 'Не удалось изменить избранное';
      }
    });
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