import { useMemo, useRef, useState } from 'react'
import { PaperAirplaneIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { connectSocket } from '../utils/socket'
import api from '../utils/api'

import type { Message } from '../types'

type ChatInputProps = {
  recipientIds: string[]
  primaryRecipientId: string
  groupId?: string
  currentUserId: string
  currentLanguage: string
  isGroupChat?: boolean
  onMessageSent: (message: Message) => void
}

const ChatInput = ({
  recipientIds,
  primaryRecipientId,
  groupId = '',
  currentUserId,
  currentLanguage,
  isGroupChat = false,
  onMessageSent,
}: ChatInputProps) => {
  const [message, setMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const socket = useMemo(() => connectSocket(), [])

  const emitTyping = (isTyping: boolean) => {
    try {
      if (isGroupChat && groupId) {
        socket.emit('groupTyping', { groupId, isTyping })
        return
      }

      if (!primaryRecipientId) return

      console.log('[ChatInput] emitting typing', { receiverId: primaryRecipientId, isTyping })
      socket.emit('typing', { receiverId: primaryRecipientId, isTyping })
    } catch {
      // ignore
    }
  }

  const emitStopTyping = () => {
    try {
      if (isGroupChat && groupId) {
        socket.emit('groupStopTyping', { groupId })
        return
      }

      if (!primaryRecipientId) return

      socket.emit('stopTyping', { receiverId: primaryRecipientId })
    } catch {
      // ignore
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSelectedFile(file)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    const nextPreview = URL.createObjectURL(file)
    setPreviewUrl(nextPreview)
  }

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadImage = async () => {
    if (!selectedFile) {
      return null
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('receiverId', primaryRecipientId || recipientIds[0] || '')
    formData.append('message', message.trim())

    const response = await api.post('/api/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.data
  }

  const sendMessage = async () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage && !selectedFile) {
      return
    }

    setIsSending(true)
    try {
      const clientMessageId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      if (isGroupChat) {
        if (!groupId) {
          return
        }

        const formData = new FormData()
        formData.append('message', trimmedMessage)
        formData.append('clientMessageId', clientMessageId)
        formData.append('language', currentLanguage)

        if (selectedFile) {
          formData.append('file', selectedFile)
        }

        const response = await api.post(`/api/groups/${groupId}/messages`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        onMessageSent(response.data?.message)
      } else {
        const receiverId = primaryRecipientId || recipientIds[0] || currentUserId
        const uploadResponse = selectedFile ? await uploadImage() : null
        const fileUrl = String(uploadResponse?.fileUrl || '')
        const imageUrl = String(uploadResponse?.message?.imageUrl || uploadResponse?.imageUrl || fileUrl || '') || null
        const optimisticMessage: Message = {
          id: clientMessageId,
          clientMessageId,
          text: trimmedMessage,
          senderId: currentUserId,
          receiverId,
          timestamp: new Date(),
          status: 'sent',
          language: currentLanguage,
          imageUrl,
          reactions: [],
        }

        if (selectedFile) {
          onMessageSent({
            ...optimisticMessage,
            id: String(uploadResponse?.message?.id || uploadResponse?.message?._id || clientMessageId),
            imageUrl,
            translated: uploadResponse?.message?.translated ?? optimisticMessage.translated,
          })
        } else {
          onMessageSent(optimisticMessage)

          socket.emit('sendMessage', {
            receiverId,
            message: trimmedMessage,
            language: currentLanguage,
            clientMessageId,
          })
        }
      }

      emitStopTyping()
      setMessage('')
      clearSelectedFile()
      inputRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void sendMessage()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
      {previewUrl && (
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <img src={previewUrl} alt="Upload preview" className="h-16 w-16 rounded-xl object-cover" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Image ready to send</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedFile?.name}</p>
          </div>
          <button type="button" onClick={clearSelectedFile} className="rounded-full p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Attach image"
        >
          <PaperClipIcon className="h-5 w-5" />
        </button>

        <div className="flex-1 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
          <textarea
            ref={inputRef}
            value={message}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setMessage(nextValue)

                  if (nextValue.length === 0) {
                    emitStopTyping()
                    return
                  }

                  emitTyping(true)
                }}
            onKeyDown={handleKeyDown}
            placeholder={isGroupChat ? 'Message group...' : 'Type a message...'}
            rows={1}
            className="w-full resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSending || (!message.trim() && !selectedFile)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#4f46e5' }}
        >
          <PaperAirplaneIcon className="h-5 w-5 rotate-90" />
        </button>
      </div>
    </form>
  )
}

export { ChatInput }