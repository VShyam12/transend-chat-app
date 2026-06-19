import { useEffect, useMemo, useRef, useState, useCallback, type ChangeEvent } from 'react'
import { ChatInput } from './ChatInput'
import { MessageBubble } from './MessageBubble'
import { ThemeSettings } from './Settings/ThemeSettings'
import { TypingIndicator } from './Chat/TypingIndicator'
import type { User, Message, Chat } from '../types'
import { useTheme } from '../context/ThemeContext'
import { useChats } from '../context/ChatsContext'
import api from '../utils/api'
import { connectSocket } from '../utils/socket'
import { LANGUAGES } from '../data/languages'
import { updateStoredUserLanguage } from '../store/authStore'
import { playNotificationSound, showBrowserNotification } from '../utils/notification'

type ChatWindowProps = {
  currentUser: User
  selectedChat: Chat
  onGroupsChanged: () => void
}

const sortMessages = (messagesToSort: Message[]) => [...messagesToSort].sort(
  (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
)

const normalizeTranslatedMap = (translated: any, fallbackLanguage: string): Record<string, string> | undefined => {
  if (!translated) {
    return undefined
  }

  if (typeof translated === 'string') {
    return { [fallbackLanguage]: translated }
  }

  if (typeof translated === 'object') {
    return { ...translated }
  }

  return undefined
}

const normalizeMessage = (payload: any, currentLanguage: string): Message => {
  const translatedMap = normalizeTranslatedMap(payload?.translated, currentLanguage)
  const messageId = String(payload?.id ?? payload?._id ?? payload?.clientMessageId ?? Date.now())

  return {
    _id: messageId,
    id: messageId,
    clientMessageId: payload?.clientMessageId,
    text: payload?.text ?? payload?.message ?? '',
    translated: translatedMap,
    senderId: String(payload?.senderId?._id ?? payload?.senderId ?? ''),
    receiverId: String(payload?.receiverId?._id ?? payload?.receiverId ?? ''),
    groupId: payload?.groupId ? String(payload.groupId) : undefined,
    timestamp: new Date(payload?.timestamp ?? payload?.createdAt ?? Date.now()),
    status: payload?.status ?? (payload?.isRead ? 'read' : 'sent'),
    language: payload?.language ?? currentLanguage,
    imageUrl: payload?.imageUrl ?? null,
    audioUrl: payload?.audioUrl ?? null,
    transcript: payload?.transcript ?? null,
    translatedTranscript: payload?.translatedTranscript ?? {},
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
}

const normalizeStatus = (payload: any): Message['status'] => {
  if (payload?.status === 'sent' || payload?.status === 'delivered' || payload?.status === 'read') {
    return payload.status
  }

  if (payload?.isRead) {
    return 'read'
  }

  return 'sent'
}

const ChatWindow = ({ currentUser, selectedChat, onGroupsChanged }: ChatWindowProps) => {
  const { addMessage, resetUnreadCount, markMessageDeleted, markMessageEdited } = useChats()
  const preferredLanguage = (currentUser as User & { preferredLanguage?: string })?.preferredLanguage
  const effectiveUserLanguage = preferredLanguage || currentUser.language || 'en'
  const [messages, setMessages] = useState<Message[]>([])
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeLanguage, setActiveLanguage] = useState(effectiveUserLanguage)
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false)
  const [isRecipientTyping, setIsRecipientTyping] = useState(false)
  const [isGroupTyping, setIsGroupTyping] = useState(false)
  const [groupTypingLabel, setGroupTypingLabel] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const {
    theme,
    toggleTheme,
    accentColor,
    setAccentColor,
    bubbleStyle,
    setBubbleStyle,
  } = useTheme()

  const isGroupChat = Boolean(selectedChat.isGroup)
  const primaryRecipient = selectedChat.participants?.[0]
  const recipientIds = selectedChat.participantIds?.filter((participantId) => participantId !== currentUser.id)
    ?? (primaryRecipient?.id ? [primaryRecipient.id] : [])
  const participantNamesById = useMemo(() => {
    const entries: Array<[string, string]> = [[currentUser.id, currentUser.name]]
    for (const participant of selectedChat.participants || []) {
      entries.push([participant.id, participant.name])
    }
    if (primaryRecipient?.id) {
      entries.push([primaryRecipient.id, primaryRecipient.name])
    }

    return Object.fromEntries(entries.filter(([id]) => Boolean(id)))
  }, [currentUser.id, currentUser.name, primaryRecipient?.id, primaryRecipient?.name, selectedChat.participants])
  const visibleParticipants = useMemo(() => (
    isGroupChat
      ? (selectedChat.participants || [])
      : (primaryRecipient ? [primaryRecipient] : [])
  ), [isGroupChat, primaryRecipient, selectedChat.participants])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const upsertMessage = (nextMessage: Message) => {
    setMessages((prevMessages) => {
      const existingIndex = prevMessages.findIndex(
        (message) => message.id === nextMessage.id || (
          nextMessage.clientMessageId && message.clientMessageId === nextMessage.clientMessageId
        )
      )

      if (existingIndex >= 0) {
        const updatedMessages = prevMessages.map((message, index) => (
          index === existingIndex ? nextMessage : message
        ))

        return sortMessages(updatedMessages)
      }

      return sortMessages([...prevMessages, nextMessage])
    })
  }

  const applyDeletedMessage = useCallback((messageId: string, deletedAt?: string | Date | null) => {
    if (!messageId) {
      return
    }

    const deletedTimestamp = deletedAt ?? new Date()

    setMessages((prevMessages) => prevMessages.map((message) => (
      message.id === messageId
        ? {
          ...message,
          text: 'This message was deleted',
          translated: undefined,
          imageUrl: null,
          deleted: true,
          deletedAt: deletedTimestamp,
        }
        : message
    )))

    markMessageDeleted(messageId, deletedTimestamp)
  }, [markMessageDeleted])

  const applyEditedMessage = useCallback((nextMessage: Message) => {
    if (!nextMessage?.id) {
      return
    }

    setMessages((prevMessages) => prevMessages.map((message) => (
      message.id === nextMessage.id
        ? {
          ...message,
          ...nextMessage,
        }
        : message
    )))

    markMessageEdited(nextMessage.id, nextMessage)
  }, [markMessageEdited])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    setActiveLanguage(effectiveUserLanguage)
  }, [effectiveUserLanguage])

  useEffect(() => {
    let isMounted = true

    const loadOnlineUsers = async () => {
      try {
        const response = await api.get('/api/users/online')
        const users = Array.isArray(response.data?.users) ? response.data.users : []
        const nextOnlineIds = new Set<string>(
          users
            .map((user: any) => String(user?._id ?? user?.id ?? ''))
            .filter(Boolean)
        )

        if (isMounted) {
          setOnlineUserIds(nextOnlineIds)
        }
      } catch {
        if (isMounted) {
          setOnlineUserIds(new Set())
        }
      }
    }

    loadOnlineUsers()
    const intervalId = window.setInterval(loadOnlineUsers, 5000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  const selectedChatParticipantIds = useMemo(
    () => new Set(selectedChat.participantIds ?? visibleParticipants.map((participant) => participant.id)),
    [selectedChat.participantIds, visibleParticipants]
  )
  const isRecipientOnline = !isGroupChat && Boolean(primaryRecipient?.id) && onlineUserIds.has(primaryRecipient.id)

  useEffect(() => {
    setIsRecipientTyping(false)
  }, [selectedChat.id, primaryRecipient?.id])

  useEffect(() => {
    let isMounted = true

    const loadMessages = async () => {
      console.log('loadMessages triggered - dependencies:', {
        selectedChatId: selectedChat.id,
        primaryRecipientId: primaryRecipient?.id,
        activeLanguage,
      })
      if (isGroupChat) {
        setIsLoading(true)
        setError('')

        try {
          const response = await api.get(`/api/groups/${selectedChat.id}/messages`)
          const groupMessages = (response.data?.messages || []).map((payload: any) => (
            normalizeMessage(payload, activeLanguage)
          ))

          if (isMounted) {
            setMessages(sortMessages(groupMessages))
          }
        } catch (loadError: any) {
          if (isMounted) {
            setMessages([])
            setError(loadError?.response?.data?.error || loadError?.message || 'Failed to load messages')
          }
        } finally {
          if (isMounted) {
            setIsLoading(false)
          }
        }

        return
      }

      if (!primaryRecipient?.id) {
        if (isMounted) {
          setMessages([])
          setError('')
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const response = await api.get(`/api/messages/${primaryRecipient.id}`)
        const conversationMessages = (response.data?.messages || []).map((payload: any) => (
          normalizeMessage(payload, activeLanguage)
        ))

        if (isMounted) {
          setMessages(sortMessages(conversationMessages))
        }
      } catch (loadError: any) {
        if (isMounted) {
          setMessages([])
          setError(loadError?.response?.data?.error || loadError?.message || 'Failed to load messages')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadMessages()

    return () => {
      isMounted = false
    }
  }, [activeLanguage, isGroupChat, primaryRecipient?.id, selectedChat.id])

  useEffect(() => {
    if (isGroupChat || !primaryRecipient?.id) {
      return
    }

    const socketClient = connectSocket()
    const otherParticipantId = selectedChat.participantIds?.find((participantId) => participantId !== currentUser.id)
      ?? primaryRecipient.id
    socketClient.emit('chatOpened', { senderId: otherParticipantId })

    const markAsRead = async () => {
      try {
        await api.patch(`/api/messages/read/${primaryRecipient.id}`)
        resetUnreadCount(selectedChat.id)
      } catch {
        // Keep UI usable even if mark-as-read fails.
      }
    }

    markAsRead()
  }, [currentUser.id, isGroupChat, primaryRecipient?.id, resetUnreadCount, selectedChat.id, selectedChat.participantIds])

  useEffect(() => {
    if (!primaryRecipient?.id && !isGroupChat) {
      return
    }

    const client = connectSocket()

    const handleReceiveMessage = (payload: any) => {
      const normalized = normalizeMessage(payload, activeLanguage)
      const incomingMessage: Message = {
        ...normalized,
        imageUrl: payload?.imageUrl ?? normalized.imageUrl ?? null,
        audioUrl: payload?.audioUrl ?? normalized.audioUrl ?? null,
        transcript: payload?.transcript ?? normalized.transcript ?? null,
        translatedTranscript: payload?.translatedTranscript ?? normalized.translatedTranscript ?? {},
      }

      if (isGroupChat) {
        if (incomingMessage.groupId !== selectedChat.id || incomingMessage.senderId === currentUser.id) {
          return
        }

        upsertMessage(incomingMessage)
        addMessage(selectedChat.id, incomingMessage, selectedChat.id, currentUser.id)
        playNotificationSound()
        if (document.hidden) {
          showBrowserNotification({
            title: selectedChat.groupName || 'Group chat',
            body: `${participantNamesById[incomingMessage.senderId] || 'Someone'}: ${incomingMessage.text || ''}`,
          })
        }
        return
      }

      if (incomingMessage.receiverId !== currentUser.id) {
        return
      }

      if (incomingMessage.senderId !== primaryRecipient?.id) {
        return
      }

      setIsRecipientTyping(false)
      addMessage(primaryRecipient.id, incomingMessage, selectedChat.id, currentUser.id)

      playNotificationSound()
      if (document.hidden) {
        showBrowserNotification({
          title: primaryRecipient.name || 'New message',
          body: incomingMessage.text || '',
        })
      }

      upsertMessage(incomingMessage)
    }

    const handleMessageSent = (payload: any) => {
      if (isGroupChat) {
        return
      }

      const normalized = normalizeMessage(payload, activeLanguage)
      const sentMessage: Message = {
        ...normalized,
        imageUrl: payload?.imageUrl ?? normalized.imageUrl ?? null,
        audioUrl: payload?.audioUrl ?? normalized.audioUrl ?? null,
        transcript: payload?.transcript ?? normalized.transcript ?? null,
        translatedTranscript: payload?.translatedTranscript ?? normalized.translatedTranscript ?? {},
      }

      if (
        sentMessage.senderId === currentUser.id &&
        sentMessage.receiverId === primaryRecipient?.id
      ) {
        upsertMessage(sentMessage)
        addMessage(selectedChat.id, sentMessage, selectedChat.id, currentUser.id)
      }
    }

    const handleMessageStatusUpdate = (payload: any) => {
      if (isGroupChat) {
        return
      }

      const messageId = String(payload?.messageId ?? payload?.id ?? payload?._id ?? '')
      const nextStatus = normalizeStatus(payload)

      if (!messageId) {
        return
      }

      console.log('RECEIVED messageStatusUpdate:', payload)
      try {
        console.log('Current messages before update:', messages.map((m) => ({ id: m._id, status: m.status })))
      } catch (e) {
        console.log('Could not log current messages before update')
      }

      setMessages((prevMessages) => prevMessages.map((message) => (
        message._id === messageId || message.id === messageId || (payload?.clientMessageId && message.clientMessageId === payload.clientMessageId)
          ? {
            ...message,
            status: nextStatus,
          }
          : message
      )))

      // Log the computed new state (approximate, from current messages)
      try {
        const computed = messages.map((message) => (
          message._id === messageId || message.id === messageId || (payload?.clientMessageId && message.clientMessageId === payload.clientMessageId)
            ? { id: message._id, status: nextStatus }
            : { id: message._id, status: message.status }
        ))
        console.log('Messages after update (computed):', computed)
      } catch (e) {
        console.log('Could not compute messages after update')
      }
    }

    const handleTypingEvent = (payload: any) => {
      const senderId = String(payload?.from ?? payload?.senderId ?? '')
      if (!senderId) {
        return
      }

      console.log('typing event received from:', senderId)

      if (senderId !== primaryRecipient?.id) {
        return
      }

      if (payload?.isTyping) {
        setIsRecipientTyping(true)
      }
    }

    const handleStopTypingEvent = (payload: any) => {
      const senderId = String(payload?.from ?? payload?.senderId ?? '')
      if (senderId === primaryRecipient?.id) {
        setIsRecipientTyping(false)
      }
    }

    const handleGroupTyping = (payload: any) => {
      const senderId = String(payload?.senderId ?? '')
      const senderName = String(payload?.senderName ?? '')
      const groupId = String(payload?.groupId ?? '')
      if (!senderId || !groupId || groupId !== selectedChat.id || senderId === currentUser.id) return

      setGroupTypingLabel(senderName || null)
      setIsGroupTyping(true)
    }

    const handleGroupStopTyping = (payload: any) => {
      const senderId = String(payload?.senderId ?? '')
      const groupId = String(payload?.groupId ?? '')
      if (!senderId || !groupId || groupId !== selectedChat.id) return

      setIsGroupTyping(false)
      setGroupTypingLabel(null)
    }

    const handleReactionUpdated = (payload: any) => {
      const normalized = normalizeMessage(payload, activeLanguage)
      const updatedMessage: Message = {
        ...normalized,
        imageUrl: payload?.imageUrl ?? normalized.imageUrl ?? null,
        audioUrl: payload?.audioUrl ?? normalized.audioUrl ?? null,
        transcript: payload?.transcript ?? normalized.transcript ?? null,
        translatedTranscript: payload?.translatedTranscript ?? normalized.translatedTranscript ?? {},
      }

      if (isGroupChat) {
        if (selectedChatParticipantIds.has(updatedMessage.senderId) || updatedMessage.receiverId === currentUser.id) {
          upsertMessage(updatedMessage)
        }
        return
      }

      const conversationId = updatedMessage.senderId === currentUser.id
        ? updatedMessage.receiverId
        : updatedMessage.senderId

      if (conversationId === primaryRecipient?.id) {
        upsertMessage(updatedMessage)
      }
    }

    const handleMessageDeleted = (payload: any) => {
      const messageId = String(payload?.messageId ?? '')
      if (!messageId) {
        return
      }

      applyDeletedMessage(messageId, payload?.deletedAt ?? new Date())
    }

    const handleMessageEdited = (payload: any) => {
      const normalized = normalizeMessage(payload, activeLanguage)
      const editedMessage: Message = {
        ...normalized,
        imageUrl: payload?.imageUrl ?? normalized.imageUrl ?? null,
        audioUrl: payload?.audioUrl ?? normalized.audioUrl ?? null,
        transcript: payload?.transcript ?? normalized.transcript ?? null,
        translatedTranscript: payload?.translatedTranscript ?? normalized.translatedTranscript ?? {},
        edited: true,
        editedAt: payload?.editedAt ?? new Date(),
      }

      if (isGroupChat) {
        if (editedMessage.groupId !== selectedChat.id) {
          return
        }

        applyEditedMessage(editedMessage)
        return
      }

      if (editedMessage.receiverId !== currentUser.id) {
        return
      }

      if (editedMessage.senderId !== primaryRecipient?.id) {
        return
      }

      applyEditedMessage(editedMessage)
    }

    client.on('receiveMessage', handleReceiveMessage)
    client.on('messageSent', handleMessageSent)
    client.on('userTyping', handleTypingEvent)
    client.on('userStopTyping', handleStopTypingEvent)
    client.on('stopTyping', handleStopTypingEvent)
    client.on('userGroupTyping', handleGroupTyping)
    client.on('userGroupStopTyping', handleGroupStopTyping)
    client.on('reactionUpdated', handleReactionUpdated)
    client.on('messageDeleted', handleMessageDeleted)
    client.on('messageEdited', handleMessageEdited)
    client.on('messageStatusUpdate', handleMessageStatusUpdate)

    return () => {
      client.off('receiveMessage', handleReceiveMessage)
      client.off('messageSent', handleMessageSent)
      client.off('userTyping', handleTypingEvent)
      client.off('userStopTyping', handleStopTypingEvent)
      client.off('stopTyping', handleStopTypingEvent)
      client.off('userGroupTyping', handleGroupTyping)
      client.off('userGroupStopTyping', handleGroupStopTyping)
      client.off('reactionUpdated', handleReactionUpdated)
      client.off('messageDeleted', handleMessageDeleted)
      client.off('messageEdited', handleMessageEdited)
      client.off('messageStatusUpdate', handleMessageStatusUpdate)
    }
  }, [
    activeLanguage,
    applyDeletedMessage,
    applyEditedMessage,
    addMessage,
    currentUser.id,
    isGroupChat,
    primaryRecipient?.id,
    primaryRecipient?.name,
    selectedChat.id,
    selectedChatParticipantIds,
  ])

  const handleLanguageChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLanguage = event.target.value
    setActiveLanguage(nextLanguage)

    setIsUpdatingLanguage(true)
    try {
      await api.patch('/api/users/language', { preferredLanguage: nextLanguage })
      updateStoredUserLanguage(nextLanguage)
    } catch (languageError: any) {
      setError(languageError?.response?.data?.error || languageError?.message || 'Failed to update language')
    } finally {
      setIsUpdatingLanguage(false)
    }
  }

  const handleLocalSend = (message: Message) => {
    upsertMessage(message)

    if (isGroupChat) {
      addMessage(selectedChat.id, message, selectedChat.id, currentUser.id)
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await api.patch(`/api/messages/${messageId}/reactions`, { emoji })
    } catch (reactionError: any) {
      setError(reactionError?.response?.data?.error || reactionError?.message || 'Failed to toggle reaction')
    }
  }

  const handleEditMessage = useCallback((nextMessage: Message) => {
    applyEditedMessage(nextMessage)
  }, [applyEditedMessage])

  const handleDeleteMessage = useCallback((messageId: string, deletedAt?: string | Date | null) => {
    applyDeletedMessage(messageId, deletedAt)
  }, [applyDeletedMessage])

  const handleRenameGroup = async () => {
    const nextName = window.prompt('Rename this group', selectedChat.groupName || '')?.trim()
    if (!nextName || nextName === selectedChat.groupName) {
      return
    }

    try {
      await api.patch(`/api/groups/${selectedChat.id}`, { groupName: nextName })
      onGroupsChanged()
    } catch (renameError: any) {
      setError(renameError?.response?.data?.error || renameError?.message || 'Failed to rename group')
    }
  }

  const handleLeaveGroup = async () => {
    if (!window.confirm('Leave this group chat?')) {
      return
    }

    try {
      await api.delete(`/api/groups/${selectedChat.id}/leave`)
      onGroupsChanged()
    } catch (leaveError: any) {
      setError(leaveError?.response?.data?.error || leaveError?.message || 'Failed to leave group')
    }
  }

  const title = isGroupChat
    ? (selectedChat.groupName || `Group chat (${visibleParticipants.length})`)
    : (primaryRecipient?.name || 'Select a conversation')

  const subtitle = isGroupChat
    ? `${visibleParticipants.length} participants`
    : (isRecipientOnline ? 'Online' : 'Offline')

  return (
    <div className="flex-1 flex flex-col h-screen bg-white dark:bg-gray-900">
      <div className="h-16 flex items-center justify-between px-6 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-medium text-white"
              style={{ backgroundColor: accentColor }}
            >
              {title.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-medium text-gray-900 dark:text-white">{title}</h2>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${isGroupChat ? 'bg-indigo-500' : (isRecipientOnline ? 'bg-green-500' : 'bg-gray-400')}`}></span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={activeLanguage}
            onChange={handleLanguageChange}
            disabled={isUpdatingLanguage}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.name}
              </option>
            ))}
          </select>
          {isGroupChat && (
            <>
              <button
                type="button"
                onClick={handleRenameGroup}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={handleLeaveGroup}
                className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                Leave
              </button>
            </>
          )}
          <ThemeSettings
            onThemeChange={(isDark) => isDark ? toggleTheme() : toggleTheme()}
            onAccentColorChange={setAccentColor}
            onBubbleStyleChange={setBubbleStyle}
            currentTheme={theme}
            currentAccentColor={accentColor}
            currentBubbleStyle={bubbleStyle}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            Loading messages...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!selectedChat && !isLoading && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            Select a conversation
          </div>
        )}

        {selectedChat && !isLoading && !error && messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === currentUser.id}
            currentLanguage={activeLanguage}
            currentUserId={currentUser.id}
            onReact={handleReaction}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            userNamesById={participantNamesById}
            isGroupChat={isGroupChat}
          />
        ))}

        {selectedChat && (isRecipientTyping || isGroupTyping) && (
          <TypingIndicator isTyping={isRecipientTyping || isGroupTyping} label={isGroupTyping ? (groupTypingLabel || 'Someone') : (primaryRecipient?.name || 'Someone')} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {selectedChat && (
        <ChatInput
          recipientIds={recipientIds}
          primaryRecipientId={primaryRecipient?.id ?? ''}
          groupId={isGroupChat ? selectedChat.id : ''}
          currentUserId={currentUser.id}
          currentLanguage={activeLanguage}
          isGroupChat={isGroupChat}
          onMessageSent={handleLocalSend}
        />
      )}
    </div>
  )
}

export default ChatWindow