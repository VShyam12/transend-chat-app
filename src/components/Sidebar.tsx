import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, ArrowRightOnRectangleIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import ChatListItem from './ChatListItem'
import NewChatModal from './NewChatModal'
import type { User, Chat } from '../types'
import { logout } from '../store/authStore'
import { useSocket } from '../context/SocketContext'
import { useTheme } from '../context/ThemeContext'

type SidebarProps = {
  currentUser: User
  chats: Chat[]
  onChatSelect: (chatId: string) => void
  selectedChatId?: string
  availableUsers: User[]
  onCreateGroupChat: (groupName: string, users: User[]) => void
  onStartNewChat: (user: User) => void
}

const Sidebar = ({ currentUser, chats, onChatSelect, selectedChatId, availableUsers, onCreateGroupChat, onStartNewChat }: SidebarProps) => {
  const navigate = useNavigate()
  const { disconnect } = useSocket()
  const { theme, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [groupName, setGroupName] = useState('')
  const safeChats = chats ?? []

  const onlineCount = useMemo(() => availableUsers.filter((user) => user.status === 'online').length, [availableUsers])

  const filteredChats = safeChats.filter(chat => {
    const searchLower = searchQuery.toLowerCase()
    const participantName = chat.participants?.[0]?.name ?? ''
    const translatedMessages = typeof chat.lastMessage?.translated === 'string'
      ? chat.lastMessage.translated.toLowerCase()
      : (chat.lastMessage?.translated
        ? Object.values(chat.lastMessage.translated).join(' ').toLowerCase()
        : '')
    const nameMatch = participantName.toLowerCase().includes(searchLower)
    const messageMatch = chat.lastMessage && (
      (chat.lastMessage.text ?? '').toLowerCase().includes(searchLower) ||
      translatedMessages.includes(searchLower)
    )
    return nameMatch || messageMatch
  })

  const toggleGroupUser = (userId: string) => {
    setSelectedGroupIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ))
  }

  const handleLogout = () => {
    logout()
    disconnect()
    setShowLogoutConfirm(false)
    navigate('/')
  }

  const handleCreateGroup = () => {
    const selectedUsers = availableUsers.filter((user) => selectedGroupIds.includes(user.id))
    const trimmedGroupName = groupName.trim()

    if (selectedUsers.length >= 2 && trimmedGroupName) {
      onCreateGroupChat(trimmedGroupName, selectedUsers)
      setShowGroupModal(false)
      setSelectedGroupIds([])
      setGroupName('')
    }
  }

  return (
    <div className="w-80 h-screen flex flex-col border-r bg-white dark:bg-gray-800 dark:border-gray-700">
      {/* User Profile */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary dark:bg-primary-dark text-white flex items-center justify-center font-medium">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{currentUser.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser.language} • {onlineCount} online</p>
          </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {theme === 'light' ? (
              <MoonIcon className="h-5 w-5" />
            ) : (
              <SunIcon className="h-5 w-5" />
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowNewChatModal(true)}
          className="mt-2 w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 dark:border-primary-dark/20 dark:bg-primary-dark/10 dark:text-primary-dark"
        >
          ✏️ New Chat
        </button>
        <button
          type="button"
          onClick={() => setShowGroupModal(true)}
          className="mt-2 w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 dark:border-primary-dark/20 dark:bg-primary-dark/10 dark:text-primary-dark"
        >
          New group chat
        </button>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Logout
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:ring-primary-dark/20 dark:focus:border-primary-dark"
          />
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isSelected={chat.id === selectedChatId}
              onClick={() => onChatSelect(chat.id)}
            />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {safeChats.length === 0 ? 'No users online' : 'No chats found'}
          </div>
        )}
      </div>

      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create group chat</h3>
              <button type="button" onClick={() => setShowGroupModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Choose at least two people to start a local group conversation.</p>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Group name</span>
              <input
                type="text"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Project team"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>
            <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
              {availableUsers.length > 0 ? availableUsers.map((user) => (
                <label key={user.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(user.id)}
                    onChange={() => toggleGroupUser(user.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>
              )) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupModal(false)
                      setSelectedGroupIds([])
                      setGroupName('')
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
              )}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={selectedGroupIds.length < 2 || !groupName.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={onStartNewChat}
        currentUserId={currentUser.id}
      />

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Are you sure you want to logout?</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">You will be signed out of the application.</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
