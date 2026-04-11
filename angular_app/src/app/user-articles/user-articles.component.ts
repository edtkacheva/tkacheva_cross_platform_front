import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-user-articles',
  templateUrl: './user-articles.component.html',
  styleUrls: ['./user-articles.component.css'],
  standalone: false
})
export class UserArticlesComponent implements OnInit {

  articles: any[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.loadArticles();
  }

  loadArticles() {
    this.isLoading = true;
  
    const username = this.auth.getUsername();
    if (!username) {
      this.errorMessage = 'Пользователь не найден';
      this.isLoading = false;
      return;
    }
  
    this.api.getUserSubscriptions(username).subscribe({
      next: (subscriptions) => {
        const subscribedNames = subscriptions.map((c: any) => c.name);
  
        this.api.getAllArticles().subscribe({
          next: (allArticles) => {
            this.articles = allArticles.filter((a: any) =>
              subscribedNames.includes(a.rssChannel?.name)
            );
            console.log('Загруженные статьи:', this.articles);
            this.isLoading = false;
          },
          error: () => {
            this.errorMessage = 'Ошибка загрузки статей';
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.errorMessage = 'Ошибка загрузки подписок';
        this.isLoading = false;
      }
    });
  }
}
