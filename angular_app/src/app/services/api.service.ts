import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  User,
  RSSChannel,
  Article,
  LoginResponse,
  ArticleCategory,
  CreateRSSChannelRequest
} from '../models/types';

export interface ArticleFilterParams {
  search?: string;
  channelCategoryFilters?: ChannelCategoryFilter[];
  sortOrder?: 'newest' | 'oldest';
  periodFilter?: 'all' | 'lastMonth' | 'lastYear' | 'previousYear';
}

export interface ChannelCategoryFilter {
  channelId: number;
  categoryNames: string[];
}

export interface ChannelCategoryOption {
  name: string;
  normalizedName: string;
}

export interface ChannelCategoryGroup {
  channelId: number;
  channelName: string;
  categories: ChannelCategoryOption[];
}

export interface ArticleFilterParams {
  search?: string;
  channelCategoryFilters?: ChannelCategoryFilter[];
  sortOrder?: 'newest' | 'oldest';
  periodFilter?: 'all' | 'lastMonth' | 'lastYear' | 'previousYear';
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://localhost:7110/api';

  private encode(value: string): string {
    return encodeURIComponent(value);
  }

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      username,
      password
    });
  }

  register(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, user);
  }

  getChannelCategoryTree(): Observable<ChannelCategoryGroup[]> {
    return this.http.get<ChannelCategoryGroup[]>(
      `${this.apiUrl}/articles/category-tree`
    );
  }

  getCurrentUser(): Observable<User> {
    const username = localStorage.getItem('username') || '';
    return this.http.get<User>(`${this.apiUrl}/users/${this.encode(username)}`);
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/users/${userId}`
    );
  }

  subscribe(channelId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/users/me/subscribe/${channelId}`,
      {}
    );
  }

  unsubscribe(channelId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/users/me/unsubscribe/${channelId}`,
      {}
    );
  }

  getUserSubscriptions(): Observable<RSSChannel[]> {
    return this.http.get<RSSChannel[]>(
      `${this.apiUrl}/users/me/subscriptions`
    );
  }

  getAllChannels(): Observable<RSSChannel[]> {
    return this.http.get<RSSChannel[]>(`${this.apiUrl}/rss`);
  }

  getChannel(name: string): Observable<RSSChannel> {
    return this.http.get<RSSChannel>(
      `${this.apiUrl}/rss/${this.encode(name)}`
    );
  }

  createChannel(channel: CreateRSSChannelRequest): Observable<RSSChannel> {
    return this.http.post<RSSChannel>(`${this.apiUrl}/rss`, channel);
  }

  deleteChannel(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/rss/${id}`);
  }

  refreshRssArticles(): Observable<any> {
    return this.http.post(`${this.apiUrl}/rss/refresh`, {});
  }

  getAllArticles(
    page: number = 1,
    pageSize: number = 10,
    filters?: ArticleFilterParams
  ): Observable<Article[]> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));
  
    if (filters?.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }
  
    if (filters?.channelCategoryFilters && filters.channelCategoryFilters.length > 0) {
      params = params.set(
        'channelCategoryFilters',
        JSON.stringify(filters.channelCategoryFilters)
      );
    }
  
    if (filters?.sortOrder) {
      params = params.set('sortOrder', filters.sortOrder);
    }
  
    if (filters?.periodFilter) {
      params = params.set('periodFilter', filters.periodFilter);
    }
  
    return this.http.get<Article[]>(
      `${this.apiUrl}/articles`,
      { params }
    );
  }

  getArticle(title: string): Observable<Article> {
    return this.http.get<Article>(
      `${this.apiUrl}/articles/${this.encode(title)}`
    );
  }

  createArticle(article: any): Observable<Article> {
    return this.http.post<Article>(`${this.apiUrl}/articles`, article);
  }

  deleteArticle(title: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/articles/${this.encode(title)}`
    );
  }

  searchArticlesByDescription(text: string): Observable<Article[]> {
    return this.http.get<Article[]>(
      `${this.apiUrl}/articles/search/description/${this.encode(text)}`
    );
  }

  private buildArticleParams(
    isRead: boolean,
    page: number,
    pageSize: number,
    filters?: ArticleFilterParams
  ): HttpParams {
    let params = new HttpParams()
      .set('isRead', String(isRead))
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (filters?.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }

    if (filters?.channelCategoryFilters && filters.channelCategoryFilters.length > 0) {
      params = params.set(
        'channelCategoryFilters',
        JSON.stringify(filters.channelCategoryFilters)
      );
    }

    if (filters?.sortOrder) {
      params = params.set('sortOrder', filters.sortOrder);
    }

    if (filters?.periodFilter) {
      params = params.set('periodFilter', filters.periodFilter);
    }

    return params;
  }

  getMyUnreadArticles(
    page: number,
    pageSize: number,
    filters?: ArticleFilterParams
  ): Observable<Article[]> {
    return this.http.get<Article[]>(
      `${this.apiUrl}/articles/me`,
      {
        params: this.buildArticleParams(false, page, pageSize, filters)
      }
    );
  }

  getMyReadArticles(
    page: number,
    pageSize: number,
    filters?: ArticleFilterParams
  ): Observable<Article[]> {
    return this.http.get<Article[]>(
      `${this.apiUrl}/articles/me`,
      {
        params: this.buildArticleParams(true, page, pageSize, filters)
      }
    );
  }

  getFavoriteArticles(): Observable<Article[]> {
    return this.http.get<Article[]>(
      `${this.apiUrl}/articles/me/favorites`
    );
  }

  markArticleAsRead(articleId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/articles/${articleId}/mark-read`,
      {}
    );
  }

  addArticleToFavorites(articleId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/articles/${articleId}/favorite`,
      {}
    );
  }

  removeArticleFromFavorites(articleId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/articles/${articleId}/favorite`
    );
  }

  updateChannel(id: number, channel: CreateRSSChannelRequest): Observable<RSSChannel> {
    return this.http.put<RSSChannel>(
      `${this.apiUrl}/rss/${id}`,
      channel
    );
  }

  getCategories(): Observable<ArticleCategory[]> {
    return this.http.get<ArticleCategory[]>(
      `${this.apiUrl}/articles/categories`
    );
  }
  
  getRecommendations(): Observable<Article[]> {
    return this.http.get<Article[]>(
      `${this.apiUrl}/articles/me/recommendations`
    );
  }
}

