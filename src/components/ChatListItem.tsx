import { Chat } from '../types'
import { format } from 'date-fns'

type ChatListItemProps = {
  chat: Chat
  isSelected: boolean
  onClick: () => void
}

const ChatListItem = ({ chat, isSelected, onClick }: ChatListItemProps) => {
  const participantName = chat?.participants?.[0]?.name ?? ''
  const displayName = chat.isGroup
    ? (chat.groupName || `${chat.participants?.length || 0} people`)
    : (participantName || 'Unknown')
  const initial = displayName.charAt(0).toUpperCase()
  const isOnline = chat.participantStatus === 'online'
  const hasUnread = chat.unreadCount > 0
  const translatedPreview = typeof chat?.lastMessage?.translated === 'string'
    ? chat.lastMessage.translated
    : (chat?.lastMessage?.translated ? Object.values(chat.lastMessage.translated)[0] : '')
  const lastMessageText = translatedPreview || chat?.lastMessage?.text || ''
  const isDeletedPreview = Boolean(chat?.lastMessage?.deleted)
  const lastMessageTime = chat?.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp) : null

  return (
    <div
      onClick={onClick}
      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/5 dark:bg-primary-dark/10'
          : (hasUnread ? 'bg-blue-50/80 dark:bg-blue-900/20' : '')
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary dark:bg-primary-dark/10 dark:text-primary-dark flex items-center justify-center font-medium">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <h4 className={`text-gray-900 dark:text-white truncate ${hasUnread ? 'font-semibold' : 'font-medium'}`}>
                {displayName}
              </h4>
              {chat.isGroup && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                  Group
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {lastMessageTime && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {format(lastMessageTime, 'HH:mm')}
                </span>
              )}
              {hasUnread && (
                <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-red-500 text-[11px] font-bold text-white shadow-sm">
                  {chat.unreadCount}
                </span>
              )}
            </div>
          </div>
          {lastMessageText && (
            <p className={`text-sm truncate ${isDeletedPreview ? 'italic text-gray-400 dark:text-gray-500' : (hasUnread ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400')}`}>
              {lastMessageText}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatListItem