import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Chat, Message } from '../types'
import { connectSocket } from '../utils/socket'
import { getStoredUser } from '../store/authStore'

type ChatsContextType = {
  chats: Chat[]
  addMessage: (chatId: string, message: Message, currentChatId: string, currentUserId: string) => void
  resetUnreadCount: (chatId: string) => void
  getMessages: (chatId: string) => Message[]
  setActiveChatId: (chatId: string) => void
  markMessageDeleted: (messageId: string, deletedAt?: string | Date | null) => void
  markMessageEdited: (messageId: string, message: Message) => void
}

const ChatsContext = createContext<ChatsContextType | undefined>(undefined)

export const ChatsProvider = ({ children, initialChats }: { children: React.ReactNode, initialChats: Chat[] }) => {
  const [chats, setChats] = useState<Chat[]>(initialChats)
  const [activeChatId, setActiveChatId] = useState('')

  const getTime = (chat: any) => {
    const ts = chat?.lastMessage?.timestamp ?? chat?.lastMessage?.createdAt ?? chat?.updatedAt ?? 0
    return new Date(ts).getTime() || 0
  }

  const deletePlaceholder = 'This message was deleted'

  const markDeletedMessage = (message: Message, deletedAt?: string | Date | null) => ({
    ...message,
    text: deletePlaceholder,
    translated: undefined,
    imageUrl: null,
    deleted: true,
    deletedAt: deletedAt ?? message.deletedAt ?? new Date(),
  })

  const markEditedMessage = (message: Message, nextMessage: Message) => ({
    ...message,
    ...nextMessage,
  })

  useEffect(() => {
    setChats((prevChats) => {
      if (prevChats === initialChats) {
        return prevChats
      }

      const previousById = new Map(prevChats.map((chat) => [chat.id, chat]))

      return initialChats.map((chat) => {
        const previous = previousById.get(chat.id)
        if (!previous) {
          return chat
        }

        return {
          ...chat,
          messages: previous.messages || [],
          lastMessage: previous.lastMessage,
          unreadCount: previous.unreadCount || 0,
        }
      })
    })
  }, [initialChats])

  useEffect(() => {
    const currentUser = getStoredUser()
    const currentUserId = currentUser?.id ? String(currentUser.id) : ''
    const socket = connectSocket()

    const handleReceiveMessage = (payload: any) => {
      const senderId = String(payload?.senderId?._id ?? payload?.senderId ?? '')
      const receiverId = String(payload?.receiverId?._id ?? payload?.receiverId ?? '')
      const groupId = String(payload?.groupId ?? '')
      const chatId = groupId || (senderId === currentUserId ? receiverId : senderId)

      if (!chatId || chatId === activeChatId || senderId === currentUserId) {
        return
      }

      const messageTimestamp = new Date(payload?.timestamp ?? payload?.createdAt ?? Date.now())
      const translated = payload?.translated && typeof payload.translated === 'object'
        ? { ...payload.translated }
        : payload?.translated

      const nextMessage: Message = {
        id: String(payload?.id ?? payload?._id ?? payload?.clientMessageId ?? Date.now()),
        clientMessageId: payload?.clientMessageId,
        text: String(payload?.text ?? payload?.message ?? ''),
        translated,
        senderId,
        receiverId,
        groupId: groupId || undefined,
        timestamp: messageTimestamp,
        status: payload?.status ?? (payload?.isRead ? 'read' : 'sent'),
        language: payload?.language ?? 'en',
        imageUrl: payload?.imageUrl ?? null,
        reactions: Array.isArray(payload?.reactions)
          ? payload.reactions.map((reaction: any) => ({
              userId: String(reaction?.userId ?? ''),
              emoji: String(reaction?.emoji ?? ''),
            }))
          : [],
        createdAt: payload?.createdAt ?? payload?.timestamp ?? new Date(),
        deleted: Boolean(payload?.deleted),
        deletedAt: payload?.deletedAt ?? null,
        edited: Boolean(payload?.edited),
        editedAt: payload?.editedAt ?? null,
      }

      setChats((prevChats) => {
        const updatedChats = prevChats.map((chat) => {
          if (chat.id !== chatId) {
            return chat
          }

          return {
            ...chat,
            messages: [...(chat.messages || []), nextMessage],
            lastMessage: nextMessage,
            unreadCount: (chat.unreadCount || 0) + 1,
          }
        })

        return updatedChats.sort((left, right) => getTime(right) - getTime(left))
      })
    }

    socket.on('receiveMessage', handleReceiveMessage)

    const handleMessageDeleted = (payload: any) => {
      const messageId = String(payload?.messageId ?? '')
      if (!messageId) {
        return
      }

      setChats((prevChats) => {
        let didChange = false

        const updatedChats = prevChats.map((chat) => {
          const messageIndex = (chat.messages || []).findIndex((message) => message.id === messageId)
          const lastMessageMatches = chat.lastMessage?.id === messageId

          if (messageIndex < 0 && !lastMessageMatches) {
            return chat
          }

          didChange = true
          const deletedAt = payload?.deletedAt ?? new Date()

          const updatedMessages = (chat.messages || []).map((message) => (
            message.id === messageId ? markDeletedMessage(message, deletedAt) : message
          ))

          return {
            ...chat,
            messages: updatedMessages,
            lastMessage: lastMessageMatches && chat.lastMessage
              ? markDeletedMessage(chat.lastMessage, deletedAt)
              : chat.lastMessage,
          }
        })

        return didChange ? updatedChats : prevChats
      })
    }

    socket.on('messageDeleted', handleMessageDeleted)

    const handleMessageEdited = (payload: any) => {
      const nextMessageId = String(payload?.id ?? payload?._id ?? payload?.messageId ?? '')
      if (!nextMessageId) {
        return
      }

      const editedMessage: Message = {
        id: nextMessageId,
        clientMessageId: payload?.clientMessageId,
        text: String(payload?.text ?? payload?.message ?? ''),
        translated: payload?.translated && typeof payload.translated === 'object'
          ? { ...payload.translated }
          : payload?.translated,
        senderId: String(payload?.senderId?._id ?? payload?.senderId ?? ''),
        receiverId: String(payload?.receiverId?._id ?? payload?.receiverId ?? ''),
        groupId: payload?.groupId ? String(payload.groupId) : undefined,
        timestamp: new Date(payload?.timestamp ?? payload?.createdAt ?? Date.now()),
        createdAt: payload?.createdAt ?? payload?.timestamp ?? new Date(),
        status: payload?.status ?? (payload?.isRead ? 'read' : 'sent'),
        language: payload?.language ?? 'en',
        imageUrl: payload?.imageUrl ?? null,
        reactions: Array.isArray(payload?.reactions)
          ? payload.reactions.map((reaction: any) => ({
              userId: String(reaction?.userId ?? ''),
              emoji: String(reaction?.emoji ?? ''),
            }))
          : [],
        deleted: Boolean(payload?.deleted),
        deletedAt: payload?.deletedAt ?? null,
        edited: Boolean(payload?.edited),
        editedAt: payload?.editedAt ?? new Date(),
      }

      setChats((prevChats) => {
        let didChange = false

        const updatedChats = prevChats.map((chat) => {
          const messageIndex = (chat.messages || []).findIndex((message) => message.id === nextMessageId)
          const lastMessageMatches = chat.lastMessage?.id === nextMessageId

          if (messageIndex < 0 && !lastMessageMatches) {
            return chat
          }

          didChange = true
          const updatedMessages = (chat.messages || []).map((message) => (
            message.id === nextMessageId ? markEditedMessage(message, editedMessage) : message
          ))

          return {
            ...chat,
            messages: updatedMessages,
            lastMessage: lastMessageMatches && chat.lastMessage
              ? markEditedMessage(chat.lastMessage, editedMessage)
              : chat.lastMessage,
          }
        })

        return didChange ? updatedChats : prevChats
      })
    }

    socket.on('messageEdited', handleMessageEdited)

    return () => {
      socket.off('receiveMessage', handleReceiveMessage)
      socket.off('messageDeleted', handleMessageDeleted)
      socket.off('messageEdited', handleMessageEdited)
    }
  }, [activeChatId])

  const addMessage = useCallback((chatId: string, message: Message, currentChatId: string, currentUserId: string) => {
    setChats(prevChats => {
      // First, update the chat with the new message
      const updatedChats = prevChats.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messages: [...(chat.messages || []), message],
              lastMessage: message,
              // Only increment unread count if the message is from recipient AND this isn't the current chat
              unreadCount: message.senderId !== currentUserId && chatId !== currentChatId 
                ? (chat.unreadCount || 0) + 1 
                : chat.unreadCount || 0
            }
          : chat
      )

      // Then sort chats by last message timestamp (safe with string or Date)
      return updatedChats.sort((a, b) => getTime(b) - getTime(a))
    })
  }, [])

  const getMessages = useCallback((chatId: string): Message[] => {
    const chat = chats.find(c => c.id === chatId)
    return chat?.messages || []
  }, [chats])

  const resetUnreadCount = useCallback((chatId: string) => {
    if (!chatId) {
      return
    }

    setChats(prevChats => {
      let didChange = false

      const updatedChats = prevChats.map(chat => {
        if (chat.id !== chatId || (chat.unreadCount || 0) === 0) {
          return chat
        }

        didChange = true
        return {
          ...chat,
          unreadCount: 0
        }
      })

      return didChange ? updatedChats : prevChats
    })
  }, [])

  const markMessageDeleted = useCallback((messageId: string, deletedAt?: string | Date | null) => {
    if (!messageId) {
      return
    }

    setChats((prevChats) => {
      let didChange = false

      const updatedChats = prevChats.map((chat) => {
        const messageIndex = (chat.messages || []).findIndex((message) => message.id === messageId)
        const lastMessageMatches = chat.lastMessage?.id === messageId

        if (messageIndex < 0 && !lastMessageMatches) {
          return chat
        }

        didChange = true

        const updatedMessages = (chat.messages || []).map((message) => (
          message.id === messageId
            ? markDeletedMessage(message, deletedAt)
            : message
        ))

        return {
          ...chat,
          messages: updatedMessages,
          lastMessage: lastMessageMatches && chat.lastMessage
            ? markDeletedMessage(chat.lastMessage, deletedAt)
            : chat.lastMessage,
        }
      })

      return didChange ? updatedChats : prevChats
    })
  }, [])

  const markMessageEdited = useCallback((messageId: string, nextMessage: Message) => {
    if (!messageId) {
      return
    }

    setChats((prevChats) => {
      let didChange = false

      const updatedChats = prevChats.map((chat) => {
        const messageIndex = (chat.messages || []).findIndex((message) => message.id === messageId)
        const lastMessageMatches = chat.lastMessage?.id === messageId

        if (messageIndex < 0 && !lastMessageMatches) {
          return chat
        }

        didChange = true
        const updatedMessages = (chat.messages || []).map((message) => (
          message.id === messageId ? markEditedMessage(message, nextMessage) : message
        ))

        return {
          ...chat,
          messages: updatedMessages,
          lastMessage: lastMessageMatches && chat.lastMessage
            ? markEditedMessage(chat.lastMessage, nextMessage)
            : chat.lastMessage,
        }
      })

      return didChange ? updatedChats : prevChats
    })
  }, [])

  const value = useMemo(
    () => ({ chats, addMessage, resetUnreadCount, getMessages, setActiveChatId, markMessageDeleted, markMessageEdited }),
    [chats, addMessage, resetUnreadCount, getMessages, markMessageDeleted, markMessageEdited]
  )

  return (
    <ChatsContext.Provider value={value}>
      {children}
    </ChatsContext.Provider>
  )
}

export const useChats = () => {
  const context = useContext(ChatsContext)
  if (context === undefined) {
    throw new Error('useChats must be used within a ChatsProvider')
  }
  return context
}