import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChildren,
  ViewChild,
  ElementRef,
  QueryList
} from '@angular/core';

import { ApiService, ArticleFilterParams } from '../../services/api.service';
import { Article, RSSChannel } from '../../models/types';

type SortOrder = 'newest' | 'oldest';
type PeriodFilter = 'all' | 'lastMonth' | 'lastYear' | 'previousYear';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css'],
  standalone: false
})
export class ContentComponent implements OnInit, AfterViewInit, OnDestroy {
  articles: Article[] = [];
  userSubscriptions: RSSChannel[] = [];

  isLoading = false;
  isLoadingMore = false;
  errorMessage = '';

  pageSize = 10;
  hasMoreArticles = true;

  searchQuery = '';
  selectedChannelIds: number[] = [];
  isChannelFilterOpen = false;
  sortOrder: SortOrder = 'newest';
  periodFilter: PeriodFilter = 'all';

  private articleObserver?: IntersectionObserver;
  private loadingObserver?: IntersectionObserver;
  private markingReadIds = new Set<number>();
  private searchDebounceId?: ReturnType<typeof setTimeout>;

  @ViewChildren('articleCard') articleCards!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('loadMoreTrigger') loadMoreTrigger?: ElementRef<HTMLElement>;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadUserSubscriptions();
    this.loadArticles(true);
    this.refreshRssInBackground();
  }

  ngAfterViewInit() {
    this.articleCards.changes.subscribe(() => {
      this.observeArticleCards();
    });

    setTimeout(() => {
      this.observeArticleCards();
      this.observeLoadMoreTrigger();
    });
  }

  ngOnDestroy() {
    this.articleObserver?.disconnect();
    this.loadingObserver?.disconnect();

    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }
  }

  loadArticles(reset: boolean = false) {
    if (this.isLoadingMore) {
      return;
    }

    if (reset) {
      this.articles = [];
      this.hasMoreArticles = true;
      this.isLoading = true;
      this.errorMessage = '';

      this.articleObserver?.disconnect();
      this.loadingObserver?.disconnect();
    } else {
      if (!this.hasMoreArticles) {
        return;
      }

      this.isLoadingMore = true;
    }

    const pageToLoad = 1;

    this.apiService.getMyUnreadArticles(
      pageToLoad,
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

        this.isLoading = false;
        this.isLoadingMore = false;

        setTimeout(() => {
          this.observeArticleCards();
          this.observeLoadMoreTrigger();
        });
      },
      error: (error) => {
        console.error('Ошибка загрузки ленты:', error);
        this.errorMessage = 'Не удалось загрузить ленту';
        this.isLoading = false;
        this.isLoadingMore = false;
      }
    });
  }

  loadMoreArticles() {
    this.loadArticles(false);
  }

  refreshRssInBackground() {
    this.apiService.refreshRssArticles().subscribe({
      next: () => {
        this.loadArticles(true);
        this.loadUserSubscriptions();
      },
      error: (error) => {
        console.error('Ошибка фонового обновления RSS:', error);
      }
    });
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

  clearFilters() {
    this.searchQuery = '';
    this.selectedChannelIds = [];
    this.isChannelFilterOpen = false;
    this.sortOrder = 'newest';
    this.periodFilter = 'all';

    this.applyFilters();
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

  observeLoadMoreTrigger() {
    if (!this.loadMoreTrigger) {
      return;
    }

    this.loadingObserver?.disconnect();

    this.loadingObserver = new IntersectionObserver(entries => {
      const entry = entries[0];

      if (
        entry.isIntersecting &&
        !this.isLoading &&
        !this.isLoadingMore &&
        this.hasMoreArticles
      ) {
        this.loadArticles(false);
      }
    }, {
      root: null,
      rootMargin: '300px',
      threshold: 0.1
    });

    this.loadingObserver.observe(this.loadMoreTrigger.nativeElement);
  }

  observeArticleCards() {
    this.articleObserver?.disconnect();

    this.articleObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const articleId = Number(element.dataset['articleId']);

        if (!articleId) {
          continue;
        }

        const article = this.articles.find(a => a.id === articleId);

        if (!article || article.isRead || this.markingReadIds.has(article.id)) {
          continue;
        }

        const articleWasFullyScrolledPast =
          !entry.isIntersecting &&
          entry.boundingClientRect.bottom < 0;

        if (articleWasFullyScrolledPast) {
          this.markArticleAsRead(article);
        }
      }
    }, {
      root: null,
      threshold: 0
    });

    this.articleCards.forEach(card => {
      this.articleObserver?.observe(card.nativeElement);
    });
  }

  markArticleAsRead(article: Article) {
    if (article.isRead || this.markingReadIds.has(article.id)) {
      return;
    }

    this.markingReadIds.add(article.id);

    this.apiService.markArticleAsRead(article.id).subscribe({
      next: () => {
        this.markingReadIds.delete(article.id);

        this.articles = this.articles.map(a =>
          a.id === article.id
            ? { ...a, isRead: true }
            : a
        );

        setTimeout(() => {
          this.observeArticleCards();
          this.observeLoadMoreTrigger();
        });
      },
      error: (error) => {
        console.error('Ошибка отметки статьи как прочитанной:', error);
        this.markingReadIds.delete(article.id);
      }
    });
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