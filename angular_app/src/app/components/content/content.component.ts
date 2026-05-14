import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChildren,
  ViewChild,
  ElementRef,
  QueryList,
  HostListener
} from '@angular/core';

import { ApiService, ArticleFilterParams } from '../../services/api.service';
import { Article, ArticleKeyword, RSSChannel } from '../../models/types';
import { AuthService } from '../../services/auth.service';

type SortOrder = 'newest' | 'oldest';
type PeriodFilter = 'all' | 'lastMonth' | 'lastYear' | 'previousYear';

interface ArticleCategory {
  id?: number;
  articleId?: number;
  name: string;
  normalizedName?: string;
}

interface ChannelCategoryOption {
  name: string;
  normalizedName: string;
}

interface ChannelCategoryGroup {
  channelId: number;
  channelName: string;
  categories: ChannelCategoryOption[];
}

interface ChannelCategoryFilter {
  channelId: number;
  categoryNames: string[];
}

interface SelectedTopicCategory {
  channelId: number;
  categoryName: string;
}

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css'],
  standalone: false
})
export class ContentComponent implements OnInit, AfterViewInit, OnDestroy {
  articles: Article[] = [];
  userSubscriptions: RSSChannel[] = [];

  channelCategoryTree: ChannelCategoryGroup[] = [];
  isTopicFilterOpen = false;
  selectedTopicChannelIds: number[] = [];
  selectedTopicCategories: SelectedTopicCategory[] = [];
  expandedTopicChannelIds: number[] = [];

  isLoading = false;
  isLoadingMore = false;
  errorMessage = '';

  pageSize = 10;
  page = 1;
  hasMoreArticles = true;

  searchQuery = '';
  sortOrder: SortOrder = 'newest';
  periodFilter: PeriodFilter = 'all';
  isAdmin = false;

  recommendations: Article[] = [];
  isRecommendationsLoading = false;

  private articleObserver?: IntersectionObserver;
  private loadingObserver?: IntersectionObserver;
  private markingReadIds = new Set<number>();
  private seenArticleIds = new Set<number>();
  private searchDebounceId?: ReturnType<typeof setTimeout>;

  @ViewChildren('articleCard') articleCards!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('loadMoreTrigger') loadMoreTrigger?: ElementRef<HTMLElement>;

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.isAdmin = this.authService.isUserAdmin();

    this.loadUserSubscriptions();
    this.loadChannelCategoryTree();
    this.loadArticles(true);
    this.refreshRssInBackground();

    if (!this.isAdmin) {
      this.loadRecommendations();
    }
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

  @HostListener('document:click', ['$event'])
  closeFiltersOnOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (!target.closest('.topic-tree-filter')) {
      this.isTopicFilterOpen = false;
    }
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
      this.errorMessage = '';

      this.articleObserver?.disconnect();
      this.loadingObserver?.disconnect();
    } else {
      if (!this.hasMoreArticles) {
        return;
      }

      this.isLoadingMore = true;
    }

    const request = this.isAdmin
      ? this.apiService.getAllArticles(
          this.page,
          this.pageSize,
          this.getCurrentFilters()
        )
      : this.apiService.getMyUnreadArticles(
          this.page,
          this.pageSize,
          this.getCurrentFilters()
        );

    request.subscribe({
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

        setTimeout(() => {
          this.observeArticleCards();
          this.observeLoadMoreTrigger();
        });
      },
      error: (error) => {
        console.error('Ошибка загрузки ленты:', error);

        this.errorMessage = this.isAdmin
          ? 'Не удалось загрузить статьи'
          : 'Не удалось загрузить ленту';

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
        this.loadChannelCategoryTree();
        if (!this.isAdmin) {
          this.loadRecommendations();
        }
      },
      error: (error) => {
        console.error('Ошибка фонового обновления RSS:', error);
      }
    });
  }

  loadRecommendations() {
    if (this.isAdmin) {
      return;
    }
  
    this.isRecommendationsLoading = true;
  
    this.apiService.getRecommendations().subscribe({
      next: (articles) => {
        this.recommendations = articles || [];
        this.isRecommendationsLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки рекомендаций:', error);
        this.recommendations = [];
        this.isRecommendationsLoading = false;
      }
    });
  }
  
  subscribeToRecommendedChannel(article: Article) {
    if (!article.rssChannelId) {
      this.errorMessage = 'Не удалось определить канал статьи';
      return;
    }
  
    this.apiService.subscribe(article.rssChannelId).subscribe({
      next: () => {
        this.loadUserSubscriptions();
        this.loadChannelCategoryTree();
        this.loadArticles(true);
        this.loadRecommendations();
      },
      error: (error) => {
        console.error('Ошибка подписки на рекомендованный канал:', error);
        this.errorMessage =
          error?.error?.message ||
          error?.error ||
          'Не удалось подписаться на канал';
      }
    });
  }
  
  getRecommendedArticles(): Article[] {
    return this.recommendations;
  }

  loadUserSubscriptions() {
    const request = this.isAdmin
      ? this.apiService.getAllChannels()
      : this.apiService.getUserSubscriptions();

    request.subscribe({
      next: (channels) => {
        this.userSubscriptions = channels || [];
      },
      error: (error) => {
        console.error('Ошибка загрузки каналов:', error);
        this.userSubscriptions = [];
      }
    });
  }

  loadChannelCategoryTree() {
    const api = this.apiService as any;

    if (typeof api.getChannelCategoryTree !== 'function') {
      console.error('В ApiService не найден метод getChannelCategoryTree().');
      this.channelCategoryTree = [];
      return;
    }

    api.getChannelCategoryTree().subscribe({
      next: (tree: ChannelCategoryGroup[]) => {
        this.channelCategoryTree = (tree || [])
          .map(group => ({
            channelId: group.channelId,
            channelName: group.channelName,
            categories: (group.categories || [])
              .filter(category => !!category.name?.trim())
              .map(category => ({
                name: category.name,
                normalizedName: this.normalizeCategoryName(
                  category.normalizedName || category.name
                )
              }))
              .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
          }))
          .sort((a, b) => a.channelName.localeCompare(b.channelName, 'ru'));
      },
      error: (error: any) => {
        console.error('Ошибка загрузки дерева каналов и категорий:', error);
        this.channelCategoryTree = [];
      }
    });
  }

  getChannelCategoryTree(): ChannelCategoryGroup[] {
    return [...this.channelCategoryTree]
      .sort((a, b) => a.channelName.localeCompare(b.channelName, 'ru'));
  }

  toggleTopicFilter() {
    this.isTopicFilterOpen = !this.isTopicFilterOpen;
  }

  toggleTopicChannel(channelId: number) {
    if (this.isTopicChannelSelected(channelId)) {
      this.selectedTopicChannelIds = this.selectedTopicChannelIds
        .filter(id => id !== channelId);

      this.selectedTopicCategories = this.selectedTopicCategories
        .filter(item => item.channelId !== channelId);
    } else {
      this.selectedTopicChannelIds = [
        ...this.selectedTopicChannelIds,
        channelId
      ];

      if (!this.isTopicChannelExpanded(channelId)) {
        this.expandedTopicChannelIds = [
          ...this.expandedTopicChannelIds,
          channelId
        ];
      }
    }

    this.applyFilters();
  }

  isTopicChannelSelected(channelId: number): boolean {
    return this.selectedTopicChannelIds.includes(channelId);
  }

  toggleTopicChannelExpanded(channelId: number, event: Event) {
    event.stopPropagation();

    if (this.isTopicChannelExpanded(channelId)) {
      this.expandedTopicChannelIds = this.expandedTopicChannelIds
        .filter(id => id !== channelId);
    } else {
      this.expandedTopicChannelIds = [
        ...this.expandedTopicChannelIds,
        channelId
      ];
    }
  }

  isTopicChannelExpanded(channelId: number): boolean {
    return this.expandedTopicChannelIds.includes(channelId);
  }

  toggleTopicCategory(channelId: number, categoryName: string) {
    if (!this.isTopicChannelSelected(channelId)) {
      return;
    }

    const normalizedCategoryName = this.normalizeCategoryName(categoryName);

    if (!normalizedCategoryName) {
      return;
    }

    const exists = this.selectedTopicCategories.some(item =>
      item.channelId === channelId &&
      item.categoryName === normalizedCategoryName
    );

    if (exists) {
      this.selectedTopicCategories = this.selectedTopicCategories.filter(item =>
        !(item.channelId === channelId && item.categoryName === normalizedCategoryName)
      );
    } else {
      this.selectedTopicCategories = [
        ...this.selectedTopicCategories,
        {
          channelId,
          categoryName: normalizedCategoryName
        }
      ];
    }

    this.applyFilters();
  }

  isTopicCategorySelected(channelId: number, categoryName: string): boolean {
    const normalizedCategoryName = this.normalizeCategoryName(categoryName);

    return this.selectedTopicCategories.some(item =>
      item.channelId === channelId &&
      item.categoryName === normalizedCategoryName
    );
  }

  getTopicFilterLabel(): string {
    if (this.selectedTopicChannelIds.length === 0) {
      return 'Все каналы и категории';
    }

    const selectedCategoriesCount = this.selectedTopicCategories.length;

    if (this.selectedTopicChannelIds.length === 1 && selectedCategoriesCount === 0) {
      const channel = this.channelCategoryTree.find(c =>
        c.channelId === this.selectedTopicChannelIds[0]
      );

      return channel?.channelName || '1 канал';
    }

    if (selectedCategoriesCount > 0) {
      return `Каналы: ${this.selectedTopicChannelIds.length}, категории: ${selectedCategoriesCount}`;
    }

    return `Каналы: ${this.selectedTopicChannelIds.length}`;
  }

  clearTopicFilter() {
    this.selectedTopicChannelIds = [];
    this.selectedTopicCategories = [];
    this.expandedTopicChannelIds = [];
    this.isTopicFilterOpen = false;

    this.applyFilters();
  }

  getCurrentFilters(): ArticleFilterParams {
    return {
      search: this.searchQuery,
      channelCategoryFilters: this.buildChannelCategoryFilters(),
      sortOrder: this.sortOrder,
      periodFilter: this.periodFilter
    } as ArticleFilterParams;
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

    this.selectedTopicChannelIds = [];
    this.selectedTopicCategories = [];
    this.expandedTopicChannelIds = [];
    this.isTopicFilterOpen = false;

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
      this.selectedTopicChannelIds.length > 0 ||
      this.sortOrder !== 'newest' ||
      this.periodFilter !== 'all'
    );
  }

  observeLoadMoreTrigger() {
    if (this.isAdmin) {
      return;
    }

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
    if (this.isAdmin) {
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

        const article = this.articles.find(a => a.id === articleId);

        if (!article || article.isRead || this.markingReadIds.has(article.id)) {
          continue;
        }

        const articleIsVisibleEnough =
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.55;

        if (articleIsVisibleEnough) {
          this.seenArticleIds.add(article.id);

          if (this.isNearPageBottom()) {
            this.markArticleAsRead(article);
          }

          continue;
        }

        const articleWasSeenBefore = this.seenArticleIds.has(article.id);

        const articleLeftViewport =
          !entry.isIntersecting &&
          articleWasSeenBefore;

        if (articleLeftViewport) {
          this.markArticleAsRead(article);
        }
      }
    }, {
      root: null,
      threshold: [0, 0.55]
    });

    this.articleCards.forEach(card => {
      this.articleObserver?.observe(card.nativeElement);
    });
  }

  markArticleAsRead(article: Article) {
    if (this.isAdmin) {
      return;
    }

    if (article.isRead || this.markingReadIds.has(article.id)) {
      return;
    }

    this.markingReadIds.add(article.id);

    this.apiService.markArticleAsRead(article.id).subscribe({
      next: () => {
        this.markingReadIds.delete(article.id);
        this.seenArticleIds.delete(article.id);

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
    if (this.isAdmin) {
      return;
    }

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

  getArticleKeywords(article: Article): ArticleKeyword[] {
    return (article.keywords || [])
      .filter(keyword => !!keyword.text?.trim())
      .sort((a, b) => this.getKeywordSourceOrder(a.source) - this.getKeywordSourceOrder(b.source));
  }

  getArticleCategories(article: Article): ArticleCategory[] {
    const typedArticle = article as Article & { categories?: ArticleCategory[] };

    return (typedArticle.categories || [])
      .filter(category => !!category.name?.trim());
  }

  getKeywordSourceLabel(source: string | undefined): string {
    if (source === 'Title') return 'Название';
    if (source === 'Description') return 'Описание';
    if (source === 'AI') return 'AI';

    return source || 'Ключ';
  }

  private getKeywordSourceOrder(source: string | undefined): number {
    if (source === 'AI') return 1;
    if (source === 'Title') return 2;
    if (source === 'Description') return 3;

    return 4;
  }

  private isNearPageBottom(): boolean {
    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;

    return pageHeight - scrollPosition < 120;
  }

  private buildChannelCategoryFilters(): ChannelCategoryFilter[] {
    return this.selectedTopicChannelIds.map(channelId => {
      const categoryNames = this.selectedTopicCategories
        .filter(item => item.channelId === channelId)
        .map(item => item.categoryName);

      return {
        channelId,
        categoryNames
      };
    });
  }

  private normalizeCategoryName(value: string | null | undefined): string {
    return (value || '')
      .trim()
      .toLocaleLowerCase('ru-RU');
  }
}