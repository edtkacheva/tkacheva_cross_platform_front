import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, RSSChannel, Article, LoginResponse } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://localhost:7110/api';

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

  subscribe(username: string, channelName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${username}/subscribe/${channelName}`, {});
  }

  unsubscribe(username: string, channelName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${username}/unsubscribe/${channelName}`, {});
  }

  getUserSubscriptions(username: string): Observable<RSSChannel[]> {
    return this.http.get<RSSChannel[]>(`${this.apiUrl}/users/${username}/subscriptions`);
  }
  
  getAllChannels(): Observable<RSSChannel[]> {
    return this.http.get<RSSChannel[]>(`${this.apiUrl}/rss`);
  }

  getChannel(name: string): Observable<RSSChannel> {
    return this.http.get<RSSChannel>(`${this.apiUrl}/rss/${name}`);
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

  deleteUser(username: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${username}`);
  }

  deleteChannel(name: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/rss/${name}`);
  }
  
  deleteArticle(title: string) {
    return this.http.delete(`/api/articles/${title}`);
  }

  getUnreadArticles(username: string): Observable<Article[]> {
    return this.http.get<Article[]>(`${this.apiUrl}/articles/unread/${encodeURIComponent(username)}`);
  }

  markArticleAsRead(articleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/articles/${articleId}/mark-read`, {});
  }
  
}