import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { API_URL } from '../utils/api'
import api from '../utils/api'
import type { Message } from '../types'

type MessageBubbleProps = {
  message: Message
  isOwn: boolean
  currentLanguage: string
  currentUserId: string
  userNamesById?: Record<string, string>
  isGroupChat?: boolean
  onReact?: (messageId: string, emoji: string) => void
  onEditMessage?: (message: Message) => void
  onDeleteMessage?: (messageId: string, deletedAt?: string | Date | null) => void
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉']

const StatusTicks = ({ status }: { status: Message['status'] }) => {
  if (status === 'sent') {
    return <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">✓</span>
  }

  if (status === 'read') {
    return <span className="text-[10px] font-semibold text-sky-400">✓✓</span>
  }

  return <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">✓✓</span>
}

const MessageBubble = ({ message, isOwn, currentLanguage, currentUserId, userNamesById = {}, isGroupChat = false, onReact, onEditMessage, onDeleteMessage }: MessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftText, setDraftText] = useState(message.text)
  const [isSaving, setIsSaving] = useState(false)
  const isDeleted = Boolean(message.deleted)
  const createdAtValue = new Date((message.createdAt ?? message.timestamp) as string | number | Date).getTime()
  const canEdit = isOwn && !isDeleted && (Date.now() - createdAtValue) < 15 * 60 * 1000
  console.log('Message bubble:', message.text, 'imageUrl:', message.imageUrl)
  const translatedFromMap = typeof message.translated === 'object'
    ? (isGroupChat
      ? message.translated?.[currentUserId]
      : (message.translated?.[currentLanguage] || Object.values(message.translated || {})[0]))
    : undefined
  const translatedText = isGroupChat
    ? (typeof message.translated === 'string' ? message.translated : translatedFromMap)
    : (!isOwn
      ? (typeof message.translated === 'string'
        ? message.translated
        : translatedFromMap)
      : undefined)
  const displayText = isDeleted ? 'This message was deleted' : (translatedText || message.text)
  const shouldShowOriginal = !isDeleted && Boolean(translatedText) && translatedText !== message.text

  const reactionSummary = useMemo(() => {
    const reactions = Array.isArray(message.reactions) ? message.reactions : []
    const grouped = reactions.reduce<Record<string, { count: number; hasMine: boolean }>>((acc, reaction) => {
      if (!reaction?.emoji) {
        return acc
      }

      const bucket = acc[reaction.emoji] || { count: 0, hasMine: false }
      bucket.count += 1
      bucket.hasMine = bucket.hasMine || reaction.userId === currentUserId
      acc[reaction.emoji] = bucket
      return acc
    }, {})

    return Object.entries(grouped)
  }, [currentUserId, message.reactions])

  const resolvedImageUrl = useMemo(() => {
    if (!message.imageUrl) {
      return null
    }

    if (message.imageUrl.startsWith('http://') || message.imageUrl.startsWith('https://')) {
      return message.imageUrl
    }

    return `${API_URL}${message.imageUrl.startsWith('/') ? '' : '/'}${message.imageUrl}`
  }, [message.imageUrl])

  const getReactionNames = (emoji: string) => {
    const names = (Array.isArray(message.reactions) ? message.reactions : [])
      .filter((reaction) => reaction.emoji === emoji)
      .map((reaction) => userNamesById[reaction.userId] || reaction.userId)

    return Array.from(new Set(names)).join(', ')
  }

  useEffect(() => {
    if (!isEditing) {
      setDraftText(message.text)
    }
  }, [isEditing, message.text])

  const startEditing = () => {
    setDraftText(message.text)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setDraftText(message.text)
    setIsEditing(false)
  }

  const saveEditedMessage = async () => {
    const nextText = draftText.trim()
    if (!nextText || nextText === message.text.trim()) {
      setIsEditing(false)
      setDraftText(message.text)
      return
    }

    setIsSaving(true)
    try {
      const response = await api.patch(`/api/messages/${message.id}`, { message: nextText })
      const payloadMessage = response.data?.message ?? {}
      const updatedMessage: Message = {
        ...message,
        ...payloadMessage,
        id: String(payloadMessage.id ?? message.id),
        text: String(payloadMessage.text ?? payloadMessage.message ?? nextText),
        translated: payloadMessage.translated ?? message.translated,
        timestamp: new Date(payloadMessage.timestamp ?? payloadMessage.createdAt ?? message.timestamp),
        createdAt: payloadMessage.createdAt ?? message.createdAt,
        edited: true,
        editedAt: payloadMessage.editedAt ?? new Date(),
      }

      onEditMessage?.(updatedMessage)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to edit message:', error)
      window.alert('Failed to edit message')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMessage = async () => {
    const confirmed = window.confirm('Delete this message for everyone?')
    if (!confirmed) {
      return
    }

    try {
      const response = await api.delete(`/api/messages/${message.id}`)
      onDeleteMessage?.(message.id, response.data?.message?.deletedAt ?? new Date())
    } catch (error) {
      console.error('Failed to delete message:', error)
      window.alert('Failed to delete message')
    }
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`message-container relative max-w-[75%] pb-7 ${isOwn ? 'pl-2' : 'pr-2'}`}
        onMouseEnter={() => setShowReactions(true)}
        onMouseLeave={() => setShowReactions(false)}
      >
        {isGroupChat && !isOwn && (
          <div className="mb-1 ml-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {userNamesById[message.senderId] || 'Unknown'}
          </div>
        )}
        <div
          className={`relative rounded-2xl px-4 py-3 shadow-sm ${isDeleted ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' : (isOwn ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100')}`}
        >
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditedMessage}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving || !draftText.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={`whitespace-pre-wrap text-sm leading-6 ${isDeleted ? 'italic text-gray-500 dark:text-gray-400' : ''}`}>
                {displayText}
              </p>

              {resolvedImageUrl && !isDeleted && (
                <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-black/5">
                  <img
                    src={resolvedImageUrl}
                    alt={message.text || 'Uploaded image'}
                    className="max-h-72 w-full object-cover"
                  />
                </div>
              )}

              {shouldShowOriginal && (
                <p className="mt-1 whitespace-pre-wrap text-xs text-gray-500 dark:text-gray-400">
                  {message.text}
                </p>
              )}

              {!isDeleted && reactionSummary.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {reactionSummary.map(([emoji, data]) => (
                    <div
                      key={emoji}
                      className={`inline-flex flex-col rounded-full px-2 py-0.5 text-xs font-medium ${data.hasMine ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-100'}`}
                      title={getReactionNames(emoji) || emoji}
                    >
                      <span className="inline-flex items-center gap-1">
                        <span>{emoji}</span>
                        <span>{data.count}</span>
                      </span>
                      {getReactionNames(emoji) && (
                        <span className={`mt-0.5 max-w-[12rem] truncate text-[10px] font-normal ${data.hasMine ? 'text-white/80' : 'text-gray-500 dark:text-gray-300'}`}>
                          {getReactionNames(emoji)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${isDeleted ? 'text-gray-400 dark:text-gray-500' : (isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400')}`}>
                <span>{format(new Date(message.timestamp), 'HH:mm')}</span>
                {isOwn && !isDeleted && <StatusTicks status={message.status || 'sent'} />}
              </div>

              {message.edited && !isDeleted && (
                <div className={`mt-1 text-right text-[10px] ${isOwn ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                  (edited)
                </div>
              )}
            </>
          )}
        </div>

        {showReactions && !isEditing && (
          <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-0 -translate-y-1/2 flex gap-1`}>
            {isOwn && canEdit && (
              <button
                type="button"
                onClick={startEditing}
                className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs shadow-lg hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                title="Edit message"
              >
                ✏️
              </button>
            )}
            {isOwn && !isDeleted && !isGroupChat && (
              <button
                type="button"
                onClick={handleDeleteMessage}
                className="rounded-full border border-red-200 bg-white px-2 py-1 text-xs shadow-lg hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:hover:bg-red-950/40"
                title="Delete message"
              >
                🗑️
              </button>
            )}
          </div>
        )}

        {onReact && showReactions && !isDeleted && !isEditing && (
          <div className={`absolute ${isOwn ? 'right-2' : 'left-2'} top-full z-10 -mt-3 rounded-full px-2 pt-3 pb-1`}>
            <div className="flex gap-1 rounded-full border border-gray-200 bg-white px-1 py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(message.id, emoji)}
                  className="rounded-full px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { MessageBubble }