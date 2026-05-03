import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, RSSChannel, Article, LoginResponse } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://localhost:7110/api';

  private encode(value: string): string {
    return encodeURIComponent(value);
  }

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      username: username,
      password: password
    });
  }

  register(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, user);
  }

  getCurrentUser(): Observable<User> {
    const username = localStorage.getItem('username');
    return this.http.get<User>(`${this.apiUrl}/users/${username}`);
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
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
    return this.http.get<RSSChannel>(`${this.apiUrl}/rss/${name}`);
  }

  refreshRssArticles(): Observable<any> {
    return this.http.post(`${this.apiUrl}/rss/refresh`, {});
  }

  createChannel(channel: RSSChannel): Observable<RSSChannel> {
    return this.http.post<RSSChannel>(`${this.apiUrl}/rss`, channel);
  }

  getAllArticles(): Observable<Article[]> {
    return this.http.get<Article[]>(`${this.apiUrl}/articles`);
  }

  getArticle(title: string): Observable<Article> {
    return this.http.get<Article>(`${this.apiUrl}/articles/${encodeURIComponent(title)}`);
  }

  createArticle(article: any): Observable<Article> {
    return this.http.post<Article>(`${this.apiUrl}/articles`, article);
  }

  searchArticlesByDescription(text: string): Observable<Article[]> {
    return this.http.get<Article[]>(`${this.apiUrl}/articles/search/description/${encodeURIComponent(text)}`);
  }

  deleteChannel(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/rss/${id}`);
  }
  
  deleteArticle(title: string) {
    return this.http.delete(`/api/articles/${title}`);
  }

  getMyArticles(): Observable<Article[]> {
    return this.http.get<Article[]>(
      `${this.apiUrl}/articles/me`
    );
  }
  getFavoriteArticles(): Observable<Article[]> {
    return this.http.get<Article[]>(
      `${this.apiUrl}/articles/me/favorites`
    );
  }
  
  deleteUser(username: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/users/${this.encode(username)}`
    );
  }

  markArticleAsRead(articleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/articles/${articleId}/mark-read`, {});
  }

  addArticleToFavorites(articleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/articles/${articleId}/favorite`, {});
  }
  
  removeArticleFromFavorites(articleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/articles/${articleId}/favorite`);
  }
  
}