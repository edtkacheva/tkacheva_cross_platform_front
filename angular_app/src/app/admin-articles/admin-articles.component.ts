import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-admin-articles',
  templateUrl: './admin-articles.component.html',
  styleUrls: ['./admin-articles.component.css'],
  standalone: false
})
export class AdminArticlesComponent implements OnInit {

  groupedArticles: { [channel: string]: any[] } = {};
  isLoading = false;
  errorMessage = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadArticles();
  }

  loadArticles() {
    this.isLoading = true;
  
    this.api.getAllChannels().subscribe(channels => {
  
      const channelMap = new Map<number, string>(
        channels.map((c: any) => [c.id, c.name])
      );
  
      this.api.getAllArticles().subscribe({
        next: (articles) => {
          this.groupedArticles = {};
  
          for (const article of articles) {
            const channelName =
              channelMap.get(article.rssChannelId) ?? 'Неизвестный канал';
  
            if (!this.groupedArticles[channelName]) {
              this.groupedArticles[channelName] = [];
            }
  
            this.groupedArticles[channelName].push(article);
          }
  
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Ошибка загрузки статей';
          this.isLoading = false;
        }
      });
    });
  }  

  deleteArticle(title: string) {
    if (!confirm(`Удалить статью "${title}"?`)) return;

    this.api.deleteArticle(title).subscribe({
      next: () => this.loadArticles(),
      error: () => alert('Ошибка удаления статьи')
    });
  }
  
}
