export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  language: string;
  status: 'online' | 'offline';
  lastSeen?: Date;
}

export interface Message {
  _id?: string;
  id: string;
  senderId: string;
  receiverId: string;
  groupId?: string;
  text: string;
  translated?: string | Record<string, string>;
  clientMessageId?: string;
  timestamp: Date;
  createdAt?: string | Date;
  status: 'sent' | 'delivered' | 'read';
  language: string;
  file?: {
    url: string;
    type: string;
    name: string;
  };
  imageUrl?: string | null;
  audioUrl?: string | null;
  reactions?: Array<{
    userId: string;
    emoji: string;
  }>;
  deleted?: boolean;
  deletedAt?: string | Date | null;
  edited?: boolean;
  editedAt?: string | Date | null;
}

export interface ChatParticipant {
  id: string;
  name: string;
  email: string;
}

export interface Chat {
  id: string;
  participants: ChatParticipant[];
  participantId: string;
  participantEmail: string;
  participantLanguage: string;
  participantStatus: 'online' | 'offline';
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup?: boolean;
  groupName?: string;
  participantIds?: string[];
}

export interface Theme {
  mode: 'light' | 'dark';
  primary: string;
  background: string;
  surface: string;
  text: string;
}

export type Language = {
  code: string;
  name: string;
  flag: string;
};