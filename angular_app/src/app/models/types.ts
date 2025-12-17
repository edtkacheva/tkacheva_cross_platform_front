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
  articles?: Article[];
}

export interface Article {
  id?: number;
  title: string;
  url: string;
  description?: string;
  content?: string;
  publishedAt?: string;
  rSSChannel?: RSSChannel;
}

export interface LoginResponse {
  username?: string;
  token?: string;
  message?: string;
}