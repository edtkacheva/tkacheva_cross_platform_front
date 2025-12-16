import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { RSSChannel, Article } from '../../models/types';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css'],
  standalone: false
})
export class ContentComponent implements OnInit {
  channels: RSSChannel[] = [];
  articles: Article[] = [];
  userSubscriptions: RSSChannel[] = [];
  isLoading = false;
  errorMessage = '';
  activeTab: 'all' | 'subscriptions' | 'search' = 'all';
  searchQuery = '';
  isAdmin = false;

  constructor(
    private apiService: ApiService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.isAdmin = this.authService.isUserAdmin();
    this.loadData();
    
    if (this.authService.isLoggedIn()) {
      this.loadUserSubscriptions();
    }
  }

  loadData() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.apiService.getAllChannels().subscribe({
      next: (channels) => {
        this.channels = channels || [];
        this.loadArticles();
      },
      error: (error) => {
        console.error('Error loading channels:', error);
        this.errorMessage = 'Failed to load channels';
        this.isLoading = false;
      }
    });
  }

  loadArticles() {
    this.apiService.getAllArticles().subscribe({
      next: (articles) => {
        this.articles = articles || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading articles:', error);
        this.errorMessage = 'Failed to load articles';
        this.isLoading = false;
      }
    });
  }

  loadUserSubscriptions() {
    const username = this.authService.getUsername();
    if (username) {
      this.apiService.getUserSubscriptions(username).subscribe({
        next: (subscriptions) => {
          this.userSubscriptions = subscriptions;
        },
        error: (error) => {
          console.error('Error loading subscriptions:', error);
        }
      });
    }
  }

  getFilteredArticles() {
    if (this.activeTab === 'subscriptions') {
      const subscribedChannelNames = this.userSubscriptions.map(c => c.name);
      return this.articles.filter(article => 
        article.rSSChannel && subscribedChannelNames.includes(article.rSSChannel.name)
      );
    }
    return this.articles;
  }

  subscribeToChannel(channelName: string) {
    const username = this.authService.getUsername();
    if (!username) {
      this.errorMessage = 'You must be logged in to subscribe';
      return;
    }

    this.apiService.subscribe(username, channelName).subscribe({
      next: () => {
        this.loadUserSubscriptions();
      },
      error: (error) => {
        console.error('Error subscribing:', error);
        this.errorMessage = 'Failed to subscribe';
      }
    });
  }

  unsubscribeFromChannel(channelName: string) {
    const username = this.authService.getUsername();
    if (!username) return;

    this.apiService.unsubscribe(username, channelName).subscribe({
      next: () => {
        this.loadUserSubscriptions();
      },
      error: (error) => {
        console.error('Error unsubscribing:', error);
        this.errorMessage = 'Failed to unsubscribe';
      }
    });
  }

  isSubscribed(channelName: string): boolean {
    return this.userSubscriptions.some(c => c.name === channelName);
  }

  searchArticles() {
    if (!this.searchQuery.trim()) {
      this.errorMessage = 'Please enter search text';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    
    this.apiService.searchArticlesByDescription(this.searchQuery).subscribe({
      next: (articles) => {
        this.articles = articles;
        this.activeTab = 'search';
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Search error:', error);
        this.errorMessage = 'Search failed';
        this.isLoading = false;
      }
    });
  }

  clearSearch() {
    this.searchQuery = '';
    this.activeTab = 'all';
    this.loadData();
  }

  setActiveTab(tab: 'all' | 'subscriptions' | 'search') {
    this.activeTab = tab;
  }

  refreshData() {
    this.loadData();
    if (this.authService.isLoggedIn()) {
      this.loadUserSubscriptions();
    }
  }

  onSearchInput(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) 
        ? 'Invalid date' 
        : date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
    } catch (error) {
      return 'Invalid date';
    }
  }

  getChannelName(article: Article): string {
    return article.rSSChannel?.name || 'Unknown channel';
  }

  isArticleFromSubscribedChannel(article: Article): boolean {
    if (!article.rSSChannel) return false;
    return this.isSubscribed(article.rSSChannel.name);
  }

  getAvailableChannels(): RSSChannel[] {
    return this.channels.filter(channel => !this.isSubscribed(channel.name));
  }

  onChannelClick(channelName: string) {
    console.log('Channel clicked:', channelName);
  }
}