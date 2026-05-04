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

import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { RSSChannel, Article } from '../../models/types';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css'],
  standalone: false
})
export class ContentComponent implements OnInit, AfterViewInit, OnDestroy {
  unreadArticles: Article[] = [];
  readArticles: Article[] = [];
  favoriteArticles: Article[] = [];
  searchResults: Article[] = [];
  adminArticles: Article[] = [];
  userSubscriptions: RSSChannel[] = [];

  isLoading = false;
  isLoadingMore = false;
  errorMessage = '';
  successMessage = '';

  searchQuery = '';
  isAdmin = false;
  isSearchMode = false;
  showFavoritesOnly = false;

  pageSize = 10;
  readPage = 1;

  hasMoreUnreadArticles = true;
  hasMoreReadArticles = true;

  private sessionStartedAt = new Date().toISOString();
  private sessionReadArticleIds = new Set<number>();
  private markingReadIds = new Set<number>();

  private articleObserver?: IntersectionObserver;
  private loadingObserver?: IntersectionObserver;

  @ViewChildren('articleCard') articleCards!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('loadMoreTrigger') loadMoreTrigger?: ElementRef<HTMLElement>;

  constructor(
    private apiService: ApiService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.isAdmin = this.authService.isUserAdmin();

    this.loadArticles(true);

    if (!this.isAdmin && this.authService.isLoggedIn()) {
      this.loadUserSubscriptions();
      this.loadFavoriteArticles();
    }

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
  }

  loadArticles(reset: boolean = true) {
    if (this.isAdmin) {
      this.loadAdminArticles();
      return;
    }

    if (reset) {
      this.unreadArticles = [];
      this.readArticles = [];
      this.searchResults = [];

      this.readPage = 1;
      this.hasMoreUnreadArticles = true;
      this.hasMoreReadArticles = true;

      this.sessionStartedAt = new Date().toISOString();
      this.sessionReadArticleIds.clear();
      this.markingReadIds.clear();

      this.isSearchMode = false;
      this.isLoading = true;
      this.errorMessage = '';

      this.articleObserver?.disconnect();
      this.loadingObserver?.disconnect();
    }

    this.loadMoreArticles();
  }

  loadAdminArticles() {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getAllArticles().subscribe({
      next: (articles) => {
        this.adminArticles = articles || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки статей администратора:', error);
        this.errorMessage = 'Не удалось загрузить статьи';
        this.isLoading = false;
      }
    });
  }

  loadMoreArticles() {
    if (
      this.isAdmin ||
      this.isSearchMode ||
      this.showFavoritesOnly ||
      this.isLoadingMore
    ) {
      return;
    }

    if (!this.hasMoreUnreadArticles && !this.hasMoreReadArticles) {
      this.isLoading = false;
      this.isLoadingMore = false;
      return;
    }

    this.isLoadingMore = true;
    this.errorMessage = '';

    if (this.hasMoreUnreadArticles) {
      this.loadMoreUnreadArticles();
      return;
    }

    this.loadMoreReadArticles();
  }

  loadMoreUnreadArticles() {
    this.apiService.getMyUnreadArticles(this.pageSize).subscribe({
      next: (articles) => {
        const loaded = articles || [];

        const existingIds = new Set(this.unreadArticles.map(a => a.id));

        const uniqueLoaded = loaded.filter(article =>
          !existingIds.has(article.id) &&
          !this.sessionReadArticleIds.has(article.id)
        );

        this.unreadArticles = [
          ...this.unreadArticles,
          ...uniqueLoaded
        ];

        this.hasMoreUnreadArticles = loaded.length === this.pageSize;

        this.isLoading = false;
        this.isLoadingMore = false;

        setTimeout(() => {
          this.observeArticleCards();
          this.observeLoadMoreTrigger();
        });

        if (!this.hasMoreUnreadArticles) {
          setTimeout(() => {
            this.loadMoreArticles();
          });
        }
      },
      error: (error) => {
        console.error('Ошибка загрузки непрочитанных статей:', error);
        this.errorMessage = 'Не удалось загрузить непрочитанные статьи';
        this.isLoading = false;
        this.isLoadingMore = false;
      }
    });
  }

  loadMoreReadArticles() {
    this.apiService
      .getMyReadArticles(this.readPage, this.pageSize, this.sessionStartedAt)
      .subscribe({
        next: (articles) => {
          const loaded = articles || [];

          const existingIds = new Set([
            ...this.unreadArticles.map(a => a.id),
            ...this.readArticles.map(a => a.id)
          ]);

          const uniqueLoaded = loaded.filter(article =>
            !existingIds.has(article.id) &&
            !this.sessionReadArticleIds.has(article.id)
          );

          this.readArticles = [
            ...this.readArticles,
            ...uniqueLoaded
          ];

          this.hasMoreReadArticles = loaded.length === this.pageSize;

          if (this.hasMoreReadArticles) {
            this.readPage++;
          }

          this.isLoading = false;
          this.isLoadingMore = false;

          setTimeout(() => {
            this.observeLoadMoreTrigger();
          });
        },
        error: (error) => {
          console.error('Ошибка загрузки прочитанных статей:', error);
          this.errorMessage = 'Не удалось загрузить прочитанные статьи';
          this.isLoading = false;
          this.isLoadingMore = false;
        }
      });
  }

  observeArticleCards() {
    if (this.isAdmin || this.showFavoritesOnly || this.isSearchMode) {
      return;
    }

    this.articleObserver?.disconnect();

    this.articleObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const articleId = Number(element.dataset['articleId']);

        if (!articleId) {
          continue;
        }

        const article = this.unreadArticles.find(a => a.id === articleId);

        if (
          !article ||
          article.isRead ||
          this.sessionReadArticleIds.has(article.id) ||
          this.markingReadIds.has(article.id)
        ) {
          continue;
        }

        const articleWasFullyScrolledPast =
          !entry.isIntersecting &&
          entry.boundingClientRect.bottom < 0;

        if (articleWasFullyScrolledPast) {
          this.markArticleAsReadAfterScroll(article);
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

  observeLoadMoreTrigger() {
    if (
      !this.loadMoreTrigger ||
      this.isAdmin ||
      this.showFavoritesOnly ||
      this.isSearchMode
    ) {
      return;
    }

    this.loadingObserver?.disconnect();

    this.loadingObserver = new IntersectionObserver(entries => {
      const entry = entries[0];

      if (
        entry.isIntersecting &&
        !this.isLoading &&
        !this.isLoadingMore &&
        (this.hasMoreUnreadArticles || this.hasMoreReadArticles)
      ) {
        this.loadMoreArticles();
      }
    }, {
      root: null,
      rootMargin: '300px',
      threshold: 0.1
    });

    this.loadingObserver.observe(this.loadMoreTrigger.nativeElement);
  }

  markArticleAsReadAfterScroll(article: Article) {
    if (
      article.isRead ||
      this.markingReadIds.has(article.id) ||
      this.sessionReadArticleIds.has(article.id)
    ) {
      return;
    }

    this.markingReadIds.add(article.id);

    this.apiService.markArticleAsRead(article.id).subscribe({
      next: () => {
        article.isRead = true;

        this.sessionReadArticleIds.add(article.id);
        this.markingReadIds.delete(article.id);

        this.unreadArticles = this.unreadArticles.map(a =>
          a.id === article.id
            ? { ...a, isRead: true }
            : a
        );

        this.favoriteArticles = this.favoriteArticles.map(a =>
          a.id === article.id
            ? { ...a, isRead: true }
            : a
        );
      },
      error: (error) => {
        console.error('Ошибка отметки статьи как прочитанной:', error);
        this.markingReadIds.delete(article.id);
      }
    });
  }

  refreshRssInBackground() {
    this.apiService.refreshRssArticles().subscribe({
      next: (result) => {
        console.log('RSS обновлены:', result);

        this.loadArticles(true);

        if (!this.isAdmin && this.authService.isLoggedIn()) {
          this.loadUserSubscriptions();
          this.loadFavoriteArticles();
        }
      },
      error: (error) => {
        console.error('Ошибка фонового обновления RSS:', error);
      }
    });
  }

  loadUserSubscriptions() {
    if (this.isAdmin) {
      return;
    }

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

  loadFavoriteArticles() {
    if (this.isAdmin) {
      return;
    }

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

  toggleFavoritesView() {
    this.showFavoritesOnly = !this.showFavoritesOnly;

    this.articleObserver?.disconnect();
    this.loadingObserver?.disconnect();

    if (this.showFavoritesOnly) {
      this.isSearchMode = false;
      this.searchQuery = '';
      this.loadFavoriteArticles();
    } else {
      setTimeout(() => {
        this.observeArticleCards();
        this.observeLoadMoreTrigger();
      });
    }
  }

  toggleFavorite(article: Article) {
    const shouldBeFavorite = !article.isFavorite;

    const request = shouldBeFavorite
      ? this.apiService.addArticleToFavorites(article.id)
      : this.apiService.removeArticleFromFavorites(article.id);

    request.subscribe({
      next: () => {
        article.isFavorite = shouldBeFavorite;

        this.unreadArticles = this.unreadArticles.map(a =>
          a.id === article.id
            ? { ...a, isFavorite: shouldBeFavorite }
            : a
        );

        this.readArticles = this.readArticles.map(a =>
          a.id === article.id
            ? { ...a, isFavorite: shouldBeFavorite }
            : a
        );

        this.searchResults = this.searchResults.map(a =>
          a.id === article.id
            ? { ...a, isFavorite: shouldBeFavorite }
            : a
        );

        this.adminArticles = this.adminArticles.map(a =>
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

  searchArticles() {
    const query = this.searchQuery.trim();

    if (!query) {
      this.clearSearch();
      return;
    }

    this.isSearchMode = true;
    this.showFavoritesOnly = false;
    this.isLoading = true;
    this.errorMessage = '';

    this.articleObserver?.disconnect();
    this.loadingObserver?.disconnect();

    this.apiService.searchArticlesByDescription(query).subscribe({
      next: (articles) => {
        this.searchResults = articles || [];
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
    this.searchResults = [];

    if (!this.isAdmin && !this.showFavoritesOnly) {
      setTimeout(() => {
        this.observeArticleCards();
        this.observeLoadMoreTrigger();
      });
    }
  }

  refreshData() {
    this.loadArticles(true);

    if (!this.isAdmin) {
      this.loadUserSubscriptions();
      this.loadFavoriteArticles();
    }
  }

  getCurrentArticles(): Article[] {
    if (this.isAdmin) {
      return this.isSearchMode ? this.searchResults : this.adminArticles;
    }

    if (this.showFavoritesOnly) {
      return this.favoriteArticles;
    }

    if (this.isSearchMode) {
      return this.searchResults;
    }

    return [
      ...this.unreadArticles,
      ...this.readArticles
    ];
  }

  hasUnreadSection(): boolean {
    return this.unreadArticles.length > 0;
  }

  hasReadSection(): boolean {
    return this.readArticles.length > 0;
  }

  openArticle(event: Event, article: Article): void {
    event.preventDefault();
    window.open(article.url, '_blank', 'noopener,noreferrer');
  }

  onSearchInput(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  trackArticle(index: number, article: Article): number {
    return article.id;
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
}