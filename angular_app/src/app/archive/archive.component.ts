import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import {
  ApiService,
  ArticleFilterParams,
  ChannelCategoryFilter,
  ChannelCategoryGroup
} from '../services/api.service';
import { Article, ArticleKeyword } from '../models/types';

type SortOrder = 'newest' | 'oldest';
type PeriodFilter = 'all' | 'lastMonth' | 'lastYear' | 'previousYear';

interface ArticleCategory {
  id?: number;
  articleId?: number;
  name: string;
  normalizedName?: string;
}

interface SelectedTopicCategory {
  channelId: number;
  categoryName: string;
}

@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.css'],
  standalone: false
})
export class ArchiveComponent implements OnInit, OnDestroy {
  articles: Article[] = [];

  channelCategoryTree: ChannelCategoryGroup[] = [];
  isTopicFilterOpen = false;
  selectedTopicChannelIds: number[] = [];
  selectedTopicCategories: SelectedTopicCategory[] = [];
  expandedTopicChannelIds: number[] = [];

  isLoading = false;
  isLoadingMore = false;
  errorMessage = '';

  page = 1;
  pageSize = 20;
  hasMoreArticles = true;

  searchQuery = '';
  sortOrder: SortOrder = 'newest';
  periodFilter: PeriodFilter = 'all';

  private searchDebounceId?: ReturnType<typeof setTimeout>;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadChannelCategoryTree();
    this.loadArticles(true);
  }

  ngOnDestroy() {
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

  loadChannelCategoryTree() {
    this.apiService.getChannelCategoryTree().subscribe({
      next: (tree) => {
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
      error: (error) => {
        console.error('Ошибка загрузки дерева каналов и категорий:', error);
        this.channelCategoryTree = [];
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
      this.selectedTopicChannelIds = [...this.selectedTopicChannelIds, channelId];

      if (!this.isTopicChannelExpanded(channelId)) {
        this.expandedTopicChannelIds = [...this.expandedTopicChannelIds, channelId];
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
      this.expandedTopicChannelIds = [...this.expandedTopicChannelIds, channelId];
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
        { channelId, categoryName: normalizedCategoryName }
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
      this.selectedTopicChannelIds.length > 0 ||
      this.sortOrder !== 'newest' ||
      this.periodFilter !== 'all'
    );
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