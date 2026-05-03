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