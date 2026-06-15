import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChatsProvider } from '../context/ChatsContext'
import { ChatContent } from '../components/ChatContent'
import api from '../utils/api'
import type { Chat, Message, User } from '../types'
import { getStoredUser } from '../store/authStore'
import { useSocket } from '../context/SocketContext'

type GroupMember = {
  userId: string
  name: string
  email: string
  language?: string
}

type GroupDocument = {
  id?: string
  _id?: string
  groupName: string
  memberIds: string[]
  members: GroupMember[]
  lastMessage?: Message
  createdAt?: string
  updatedAt?: string
}

const toTranslatedMap = (translated: any): Record<string, string> | undefined => {
  if (!translated) {
    return undefined
  }

  if (typeof translated === 'string') {
    return { en: translated }
  }

  if (typeof translated === 'object') {
    return { ...translated }
  }

  return undefined
}

const normalizeLastMessage = (payload: any, currentUserId: string, partnerId: string): Message | undefined => {
  if (!payload?.createdAt && !payload?.message) {
    return undefined
  }

  const senderId = String(payload?.senderId ?? '')
  const groupId = String(payload?.groupId ?? '')

  return {
    id: `last-${groupId || partnerId}-${payload?.createdAt || Date.now()}`,
    senderId,
    receiverId: groupId ? '' : (senderId === currentUserId ? partnerId : currentUserId),
    groupId: groupId || undefined,
    text: String(payload?.message ?? ''),
    translated: toTranslatedMap(payload?.translated),
    timestamp: new Date(payload?.createdAt ?? Date.now()),
    status: 'sent',
    language: 'en',
    imageUrl: payload?.imageUrl ?? null,
    reactions: Array.isArray(payload?.reactions)
      ? payload.reactions.map((reaction: any) => ({
          userId: String(reaction?.userId ?? ''),
          emoji: String(reaction?.emoji ?? ''),
        }))
      : [],
  }
}

const mapGroupToChat = (group: GroupDocument, currentUserId: string, onlineUserIds: Set<string>): Chat => {
  const members = Array.isArray(group.members) ? group.members : []
  const visibleMembers = members.filter((member) => member.userId !== currentUserId)
  const groupId = group.id || group._id || `group-${Date.now()}`

  return {
    id: groupId,
    participants: visibleMembers.map((member) => ({
      id: member.userId,
      name: member.name,
      email: member.email,
    })),
    participantId: visibleMembers[0]?.userId || currentUserId,
    participantEmail: visibleMembers[0]?.email || '',
    participantLanguage: visibleMembers[0]?.language || 'en',
    participantStatus: visibleMembers.some((member) => onlineUserIds.has(member.userId)) ? 'online' : 'offline',
    messages: [],
    lastMessage: group.lastMessage ? normalizeLastMessage(group.lastMessage, currentUserId, groupId) : undefined,
    unreadCount: 0,
    isGroup: true,
    groupName: group.groupName,
    participantIds: Array.isArray(group.memberIds) && group.memberIds.length > 0
      ? group.memberIds
      : members.map((member) => member.userId),
  }
}

const ChatPage = () => {
  const [selectedChatId, setSelectedChatId] = useState<string>('')
  const [chats, setChats] = useState<Chat[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [groupRefreshToken, setGroupRefreshToken] = useState(0)
  const { socket } = useSocket()
  const storedUser = getStoredUser()

  const requestGroupRefresh = useCallback(() => {
    setGroupRefreshToken((value) => value + 1)
  }, [])

  const syncPresence = useCallback((userId: string, isOnline: boolean) => {
    setAvailableUsers((prevUsers) => prevUsers.map((user) => (
      user.id === userId
        ? { ...user, status: isOnline ? 'online' : 'offline' }
        : user
    )))

    setChats((prevChats) => prevChats.map((chat) => {
      const participantIds = chat.participantIds ?? [chat.participantId]

      if (!participantIds.includes(userId)) {
        return chat
      }

      if (!chat.isGroup) {
        return {
          ...chat,
          participantStatus: isOnline ? 'online' : 'offline',
        }
      }

      const hasOnlineParticipant = participantIds.some((participantId) => {
        const participant = availableUsers.find((user) => user.id === participantId)
        return participantId === userId ? isOnline : participant?.status === 'online'
      })

      return {
        ...chat,
        participantStatus: hasOnlineParticipant ? 'online' : 'offline',
      }
    }))
  }, [availableUsers])

  const createGroupChat = useCallback((groupName: string, selectedUsers: User[]) => {
    if (selectedUsers.length < 2) {
      return
    }
    

    api.post('/api/groups', {
      groupName,
      participants: selectedUsers,
    }).then((response) => {
      console.log('[ChatPage] group created', response.data)

      const createdGroup = response.data?.group as GroupDocument | undefined
      if (!createdGroup) {
        return
      }

      const onlineIds = new Set(availableUsers.filter((user) => user.status === 'online').map((user) => user.id))
      const nextChat = mapGroupToChat(createdGroup, storedUser?.id || '', onlineIds)

      setChats((prevChats) => {
        const filteredChats = prevChats.filter((chat) => chat.id !== nextChat.id)
        return [nextChat, ...filteredChats]
      })
      setSelectedChatId(nextChat.id)
      requestGroupRefresh()
    }).catch((error) => {
      console.error('[ChatPage] group creation failed', error?.response?.data || error.message || error)
    })
  }, [availableUsers, requestGroupRefresh])

  const startNewChat = useCallback((user: User) => {
    
    // Create a new chat with the selected user
    const newChat: Chat = {
      id: user.id,
      participants: [{
        id: user.id,
        name: user.name,
        email: user.email,
      }],
      participantId: user.id,
      participantEmail: user.email,
      participantLanguage: user.language,
      participantStatus: user.status,
      messages: [],
      unreadCount: 0,
    }

    // Add the new chat to the list (or move to top if already exists)
    setChats((prevChats) => {
      const filteredChats = prevChats.filter((chat) => chat.id !== user.id)
      return [newChat, ...filteredChats]
    })

    // Select the new chat
    setSelectedChatId(user.id)
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadUsers = async () => {
      try {
        const [onlineResponse, chatsResponse, groupsResponse] = await Promise.all([
          api.get('/api/users/online'),
          api.get('/api/messages/chats'),
          api.get('/api/groups').catch(() => ({ data: { groups: [] } })),
        ])

        const onlineUsers = Array.isArray(onlineResponse.data?.users) ? onlineResponse.data.users : []
        const chatHistory = Array.isArray(chatsResponse.data?.chats) ? chatsResponse.data.chats : []
        const groups = Array.isArray(groupsResponse.data?.groups) ? groupsResponse.data.groups : []
        const currentUser = getStoredUser()
        const currentUserId = String(currentUser?.id ?? '')
        const onlineUserIds = new Set<string>(
          onlineUsers
            .map((user: any) => String(user?._id ?? user?.id ?? ''))
            .filter(Boolean)
            .filter((userId: string) => userId !== currentUserId)
        )

        const chatsById = new Map<string, Chat>()
        const availableUsersById = new Map<string, User>()

        for (const historyItem of chatHistory) {
          const historyUser = historyItem?.user
          const participantId = String(historyUser?._id ?? '')
          if (!participantId || participantId === currentUserId) {
            continue
          }

          const participantName = historyUser?.name || 'Unknown'
          const participantEmail = historyUser?.email || ''
          const participantLanguage = historyUser?.preferredLanguage || 'en'
          const lastMessage = normalizeLastMessage(historyItem?.lastMessage, currentUserId, participantId)

          chatsById.set(participantId, {
            id: participantId,
            participants: [{
              id: participantId,
              name: participantName,
              email: participantEmail,
            }],
            participantId,
            participantEmail,
            participantLanguage,
            participantStatus: onlineUserIds.has(participantId) ? 'online' : 'offline',
            messages: [],
            lastMessage,
            unreadCount: Number(historyItem?.unreadCount || 0),
          })

          availableUsersById.set(participantId, {
            id: participantId,
            name: participantName,
            email: participantEmail,
            language: participantLanguage,
            status: onlineUserIds.has(participantId) ? 'online' : 'offline',
          })
        }

        for (const user of onlineUsers) {
          const participantId = String(user?._id ?? user?.id ?? '')
          if (!participantId || participantId === currentUserId) {
            continue
          }

          if (chatsById.has(participantId)) {
            const existingUser = availableUsersById.get(participantId)
            if (existingUser) {
              availableUsersById.set(participantId, {
                ...existingUser,
                status: 'online',
              })
            }
            continue
          }

          const participantName = user.name || 'Unknown'
          const participantEmail = user.email || ''
          const participantLanguage = user.preferredLanguage || 'en'

          chatsById.set(participantId, {
            id: participantId,
            participants: [{
              id: participantId,
              name: participantName,
              email: participantEmail,
            }],
            participantId,
            participantEmail,
            participantLanguage,
            participantStatus: 'online',
            messages: [],
            unreadCount: 0,
          })

          availableUsersById.set(participantId, {
            id: participantId,
            name: participantName,
            email: participantEmail,
            language: participantLanguage,
            status: 'online',
          })
        }

        for (const group of groups as GroupDocument[]) {
          if (!group?.memberIds?.includes(currentUserId)) {
            continue
          }

          const mappedGroup = mapGroupToChat(group, currentUserId, onlineUserIds)
          chatsById.set(mappedGroup.id, mappedGroup)
        }

        const nextAvailableUsers = Array.from(availableUsersById.values())

        const mappedChats: Chat[] = Array.from(chatsById.values())
          .sort((left, right) => {
            const leftOnline = left.participantStatus === 'online'
            const rightOnline = right.participantStatus === 'online'
            const leftHasMessage = Boolean(left.lastMessage)
            const rightHasMessage = Boolean(right.lastMessage)

            const getRank = (isOnline: boolean, hasMessage: boolean) => {
              if (isOnline && hasMessage) return 0
              if (!isOnline && hasMessage) return 1
              if (isOnline && !hasMessage) return 2
              return 3
            }

            const rankDiff = getRank(leftOnline, leftHasMessage) - getRank(rightOnline, rightHasMessage)
            if (rankDiff !== 0) {
              return rankDiff
            }

            if (leftHasMessage && rightHasMessage) {
              const leftTs = new Date(left.lastMessage?.timestamp || 0).getTime()
              const rightTs = new Date(right.lastMessage?.timestamp || 0).getTime()
              return rightTs - leftTs
            }

            return (left.participants?.[0]?.name || '').localeCompare(right.participants?.[0]?.name || '')
          })

        if (isMounted) {
          setAvailableUsers(nextAvailableUsers)
          console.log('Chats poll updating state - this may overwrite status')
          setChats((prevChats) => {
            const prevById = new Map(prevChats.map((c) => [c.id, c]))
            return mappedChats.map((chat) => {
              const prev = prevById.get(chat.id)
              if (prev && Array.isArray(prev.messages) && prev.messages.length > 0) {
                // Preserve the existing messages array (and its status fields)
                return { ...chat, messages: prev.messages, lastMessage: chat.lastMessage || prev.lastMessage }
              }
              return chat
            })
          })
          setSelectedChatId((previous) => {
            if (previous && mappedChats.some((chat) => chat.id === previous)) {
              return previous
            }
            return mappedChats[0]?.id || ''
          })
        }
      } catch {
        if (isMounted) {
          setChats([])
          setSelectedChatId('')
        }
      }
    }

    loadUsers()
    const intervalId = window.setInterval(loadUsers, 10000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [groupRefreshToken])

  useEffect(() => {
    if (!socket) {
      return
    }

    const handleConnected = (payload: any) => {
      const userId = String(payload?.userId ?? '')
      if (userId) {
        syncPresence(userId, true)
      }
    }

    const handleDisconnected = (payload: any) => {
      const userId = String(payload?.userId ?? '')
      if (userId) {
        syncPresence(userId, false)
      }
    }

    socket.on('userConnected', handleConnected)
    socket.on('userDisconnected', handleDisconnected)
    socket.on('groupUpdated', requestGroupRefresh)
    socket.on('groupRemoved', requestGroupRefresh)

    return () => {
      socket.off('userConnected', handleConnected)
      socket.off('userDisconnected', handleDisconnected)
      socket.off('groupUpdated', requestGroupRefresh)
      socket.off('groupRemoved', requestGroupRefresh)
    }
  }, [socket, requestGroupRefresh, syncPresence])

  const providerChats = useMemo(() => chats, [chats])

  return (
    <ChatsProvider initialChats={providerChats}>
      <div className="flex h-screen bg-white dark:bg-gray-900">
        <ChatContent
          selectedChatId={selectedChatId}
          setSelectedChatId={setSelectedChatId}
          availableUsers={availableUsers}
          onCreateGroupChat={createGroupChat}
          onGroupsChanged={requestGroupRefresh}
          onStartNewChat={startNewChat}
        />
      </div>
    </ChatsProvider>
  )
}

export default ChatPage
