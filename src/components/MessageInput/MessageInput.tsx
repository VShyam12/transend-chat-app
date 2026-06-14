import { useState, useRef, useEffect } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import { EmojiPicker } from './EmojiPicker'
import { FileUpload } from './FileUpload'

interface MessageInputProps {
  onSendMessage: (text: string) => void
  onTypingStateChange?: (isTyping: boolean) => void
  onFileSelect?: (file: File) => void
}

export const MessageInput = ({
  onSendMessage,
  onTypingStateChange,
  onFileSelect,
}: MessageInputProps) => {
  const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Handle typing indicator
    if (onTypingStateChange) {
      onTypingStateChange(true)
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStateChange(false)
      }, 1500)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current
    if (!input) return

    const start = input.selectionStart || 0
    const end = input.selectionEnd || 0
    const newMessage = message.slice(0, start) + emoji + message.slice(end)
    
    setMessage(newMessage)
    
    // Set cursor position after emoji
    setTimeout(() => {
      input.selectionStart = input.selectionEnd = start + emoji.length
      input.focus()
    }, 0)
  }

  const handleFileSelect = (file: File) => {
    if (onFileSelect) {
      onFileSelect(file)
    }
  }

  // Clean up typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return (
    <form onSubmit={handleSubmit} className="flex items-end space-x-2 p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
      <div className="flex items-center space-x-2">
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        <FileUpload onFileSelect={handleFileSelect} />
      </div>
      
      <textarea
        ref={inputRef}
        value={message}
        onChange={handleChange}
        placeholder="Type a message..."
        className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
      />
      
      <button
        type="submit"
        disabled={!message.trim()}
        className="p-2 rounded-full bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
      >
        <PaperAirplaneIcon className="w-5 h-5" />
      </button>
    </form>
  )
}