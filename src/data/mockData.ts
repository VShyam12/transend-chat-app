import type { User, Chat, Message } from '../types'

export const currentUser: User = {
  id: '1',
  name: 'V Shyam',
  email: 'vshyam@example.com',
  language: 'en',
  status: 'online'
}

const spanishMessages: Message[] = [
  {
    id: '1',
    senderId: '2',
    receiverId: '1',
    text: '¡Hola! ¿Cómo estás?',
    translated: 'Hello! How are you?',
    timestamp: new Date(Date.now() - 5000),
    status: 'read',
    language: 'es'
  },
  {
    id: '2',
    senderId: '1',
    receiverId: '2',
    text: "I'm doing great, thanks! How about you?",
    translated: '¡Estoy muy bien, gracias! ¿Y tú?',
    timestamp: new Date(Date.now() - 4000),
    status: 'read',
    language: 'en'
  },
  {
    id: '3',
    senderId: '2',
    receiverId: '1',
    text: '¡Muy bien! Trabajando en un nuevo proyecto.',
    translated: "Very well! I'm working on a new project.",
    timestamp: new Date(Date.now() - 3000),
    status: 'delivered',
    language: 'es'
  }
]

const japaneseMessages: Message[] = [
  {
    id: '4',
    senderId: '3',
    receiverId: '1',
    text: 'こんにちは！お元気ですか？',
    translated: 'Hello! How are you?',
    timestamp: new Date(Date.now() - 5000),
    status: 'read',
    language: 'ja'
  },
  {
    id: '5',
    senderId: '1',
    receiverId: '3',
    text: "I'm doing well, thank you! How's your project going?",
    translated: 'はい、元気です！プロジェクトの進み具合はどうですか？',
    timestamp: new Date(Date.now() - 4000),
    status: 'read',
    language: 'en'
  }
]

export const mockChats: Chat[] = [
  {
    id: '1',
    participants: [{ id: '2', name: 'Maria Garcia', email: 'maria@example.com' }],
    participantId: '2',
    participantEmail: 'maria@example.com',
    participantLanguage: 'es',
    participantStatus: 'online',
    unreadCount: 2,
    messages: spanishMessages,
    lastMessage: spanishMessages[spanishMessages.length - 1]
  },
  {
    id: '2',
    participants: [{ id: '3', name: 'Kenji Tanaka', email: 'kenji@example.com' }],
    participantId: '3',
    participantEmail: 'kenji@example.com',
    participantLanguage: 'ja',
    participantStatus: 'online',
    unreadCount: 0,
    messages: japaneseMessages,
    lastMessage: japaneseMessages[japaneseMessages.length - 1]
  }
]

export const mockMessages = spanishMessages