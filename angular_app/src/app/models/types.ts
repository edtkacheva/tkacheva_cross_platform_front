export interface User {
  id?: number;
  userName: string;
  password: string;
  isAdmin?: boolean;
  subscribedChannels?: RSSChannel[];
}

export interface RSSChannel {
  id?: number;
  name: string;
  url: string;
  description?: string | null;
  articles?: Article[];
}

export interface ArticleKeyword {
  id?: number;
  articleId?: number;
  text: string;
  source?: string;
  weight?: number;
  createdAt?: string;
}

export interface Article {
  id: number;
  title: string;
  url: string;
  publishedAt: string;
  description?: string | null;
  rssChannelId: number;
  rssChannel?: RSSChannel | null;
  isRead: boolean;
  isFavorite?: boolean;
  keywords?: ArticleKeyword[];
  categories?: ArticleCategory[];
}

export interface LoginResponse {
  username?: string;
  token?: string;
  message?: string;
}

export interface CreateRSSChannelRequest {
  name: string;
  url: string;
}

export interface ArticleCategory {
  id: number;
  articleId?: number;
  name: string;
  normalizedName: string;
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

export interface ChannelCategoryFilter {
  channelId: number;
  categoryNames: string[];
}