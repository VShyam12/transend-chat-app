import { useEffect, useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import api from '../utils/api'
import type { User } from '../types'

interface NewChatModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectUser: (user: User) => void
  currentUserId: string
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  currentUserId: _currentUserId,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch all users on modal open
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const fetchUsers = async () => {
      setLoading(true)
      try {
        const response = await api.get('/api/users')
        const allUsers = Array.isArray(response.data?.users) ? response.data.users : []
        
        // Map backend user format to our User type
        const mappedUsers: User[] = allUsers.map((user: any) => ({
          id: String(user._id || user.id || ''),
          name: String(user.name || 'Unknown'),
          email: String(user.email || ''),
          language: String(user.preferredLanguage || 'en'),
          status: 'offline' as const,
          avatar: user.avatar,
        }))

        setUsers(mappedUsers)
        setFilteredUsers(mappedUsers)
      } catch (error) {
        console.error('[NewChatModal] Failed to fetch users:', error)
        setUsers([])
        setFilteredUsers([])
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [isOpen])

  // Filter users by search query
  useEffect(() => {
    const query = searchQuery.toLowerCase()
    const filtered = users.filter((user) =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
    setFilteredUsers(filtered)
  }, [searchQuery, users])

  const handleSelectUser = (user: User) => {
    onSelectUser(user)
    setSearchQuery('')
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Start new chat</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Search Input */}
        <div className="mt-4 relative">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 focus:border-primary focus:outline-none dark:focus:border-primary-dark"
          />
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>

        {/* User List */}
        <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Loading users...
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                type="button"
                className="w-full rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary dark:bg-primary-dark text-white flex items-center justify-center font-medium text-sm flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{user.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {users.length === 0 && searchQuery ? 'No users found' : 'No users available'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NewChatModal
