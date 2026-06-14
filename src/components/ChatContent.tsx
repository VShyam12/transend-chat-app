import React, { useEffect } from 'react'
import type { User, Chat } from '../types'
import { useChats } from '../context/ChatsContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import { currentUser as fallbackCurrentUser } from '../data/mockData'
import { useAuth } from '../hooks/useAuth'
import { resetPageTitle, updatePageTitleWithUnread } from '../utils/notification'

interface ChatContentProps {
  selectedChatId: string
  setSelectedChatId: (id: string) => void
  availableUsers: User[]
  onCreateGroupChat: (groupName: string, users: User[]) => void
  onGroupsChanged: () => void
  onStartNewChat?: (user: User) => void
}

export const ChatContent: React.FC<ChatContentProps> = ({
  selectedChatId,
  setSelectedChatId,
  availableUsers,
  onCreateGroupChat,
  onGroupsChanged,
  onStartNewChat,
}) => {
  const { chats, resetUnreadCount, setActiveChatId } = useChats()
  const { user: authUser } = useAuth()
  const currentUser: User = authUser ?? fallbackCurrentUser
  
  const selectedChat = chats.find((chat: Chat) => chat.id === selectedChatId)

  // Reset unread count when chat is opened
  useEffect(() => {
    if (!selectedChatId || !selectedChat || (selectedChat.unreadCount || 0) === 0) {
      setActiveChatId(selectedChatId)
      return
    }

    setActiveChatId(selectedChatId)
    resetUnreadCount(selectedChatId)
  }, [selectedChatId, selectedChat, resetUnreadCount, setActiveChatId])

  useEffect(() => {
    const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)
    updatePageTitleWithUnread(totalUnread)
  }, [chats])

  useEffect(() => {
    return () => {
      resetPageTitle()
    }
  }, [])

  return (
    <>
      <Sidebar
        currentUser={currentUser}
        chats={chats}
        onChatSelect={setSelectedChatId}
        selectedChatId={selectedChatId}
        availableUsers={availableUsers}
        onCreateGroupChat={onCreateGroupChat}
        onStartNewChat={onStartNewChat || (() => {})}
      />
      {selectedChat && (
        <ChatWindow
          currentUser={currentUser}
          selectedChat={selectedChat}
          onGroupsChanged={onGroupsChanged}
        />
      )}
    </>
  )
}