import { Component, OnInit, HostListener } from '@angular/core';
import {
  ApiService,
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
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css'],
  standalone: false
})
export class FavoritesComponent implements OnInit {
  articles: Article[] = [];

  channelCategoryTree: ChannelCategoryGroup[] = [];
  isTopicFilterOpen = false;
  selectedTopicChannelIds: number[] = [];
  selectedTopicCategories: SelectedTopicCategory[] = [];
  expandedTopicChannelIds: number[] = [];

  isLoading = false;
  errorMessage = '';

  searchQuery = '';
  sortOrder: SortOrder = 'newest';
  periodFilter: PeriodFilter = 'all';

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadChannelCategoryTree();
    this.loadArticles();
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
  }

  applyFilters() {
    // В избранном фильтрация локальная, поэтому отдельный запрос к серверу не нужен.
    // Метод оставлен, чтобы HTML был единообразным с лентой и архивом.
  }

  getFilteredArticles(): Article[] {
    let result = [...this.articles];

    const query = this.searchQuery.trim().toLocaleLowerCase('ru-RU');

    if (query) {
      result = result.filter(article =>
        this.articleMatchesKeywordSearch(article, query)
      );
    }

    if (this.selectedTopicChannelIds.length > 0) {
      result = result.filter(article =>
        this.articleMatchesTopicFilter(article)
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

    this.selectedTopicChannelIds = [];
    this.selectedTopicCategories = [];
    this.expandedTopicChannelIds = [];
    this.isTopicFilterOpen = false;

    this.sortOrder = 'newest';
    this.periodFilter = 'all';
  }

  hasActiveFilters(): boolean {
    return (
      this.searchQuery.trim().length > 0 ||
      this.selectedTopicChannelIds.length > 0 ||
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

  private articleMatchesKeywordSearch(article: Article, query: string): boolean {
    return (article.keywords || []).some(keyword =>
      (keyword.text || '')
        .toLocaleLowerCase('ru-RU')
        .includes(query)
    );
  }

  private articleMatchesTopicFilter(article: Article): boolean {
    if (this.selectedTopicChannelIds.length === 0) {
      return true;
    }

    const channelIsSelected = this.selectedTopicChannelIds.includes(article.rssChannelId);

    if (!channelIsSelected) {
      return false;
    }

    const selectedCategoriesForChannel = this.selectedTopicCategories
      .filter(item => item.channelId === article.rssChannelId)
      .map(item => item.categoryName);

    if (selectedCategoriesForChannel.length === 0) {
      return true;
    }

    const articleCategories = this.getArticleCategories(article)
      .map(category => this.normalizeCategoryName(
        category.normalizedName || category.name
      ))
      .filter(name => !!name);

    return selectedCategoriesForChannel.some(categoryName =>
      articleCategories.includes(categoryName)
    );
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