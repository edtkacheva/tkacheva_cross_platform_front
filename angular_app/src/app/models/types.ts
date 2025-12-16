export interface User {
    id: number;
    userName: string;
    password: string;
    subscribedChannels?: RSSChannel[];
  }
  
  export interface RSSChannel {
    id: number;
    name: string;
    url: string;
    description?: string;
    subscribers?: User[];
    articles?: Article[];
  }
  
  export interface Article {
    id: number;
    title: string;
    url: string;
    publishedAt: string;
    description?: string;
    rssChannelId: number;
    rSSChannel?: RSSChannel;
  }
  
  export interface LoginResponse {
    token: string;
  }