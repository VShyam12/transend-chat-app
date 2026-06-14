import { useState } from 'react'
import type { Message as MessageType } from '../types'
import { format } from 'date-fns'
import { useTheme } from '../context/ThemeContext'
import { getStoredUser } from '../store/authStore'

type MessageProps = {
  message: MessageType
  isOwn: boolean
}

const MessageComponent = ({ message, isOwn }: MessageProps) => {
  const [showOriginal, setShowOriginal] = useState(false)
  const { bubbleStyle } = useTheme()
  const userLanguage = getStoredUser()?.language || 'en'
  const translatedText = typeof message.translated === 'object'
    ? message.translated?.[userLanguage]
    : message.translated

  const getBubbleClasses = () => {
    const baseClasses = 'max-w-[70%] group'
    const roundedClasses = bubbleStyle === 'rounded' ? 'rounded-2xl' : 'rounded-lg'
    if (isOwn) {
      return `${baseClasses} text-white ${roundedClasses} px-4 py-3 space-y-1 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg`
    }

    return `${baseClasses} bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 ${roundedClasses} px-4 py-2 space-y-1`
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={getBubbleClasses()}
        onMouseEnter={() => setShowOriginal(true)}
        onMouseLeave={() => setShowOriginal(false)}
      >
        {/* Message content */}
        <p className="text-sm">
          {showOriginal ? message.text : translatedText || message.text}
        </p>

        {/* File preview if present */}
        {message.file && message.file.type.startsWith('image/') && (
          <div className="mt-2">
            <img 
              src={message.file.url} 
              alt={message.file.name}
              className="max-w-[200px] rounded-lg"
            />
          </div>
        )}

        {/* Language indicator and time */}
        <div className={`flex items-center justify-end space-x-2 text-xs ${
          isOwn ? 'text-white/70' : 'text-gray-500'
        }`}>
          <span className="uppercase">{message.language}</span>
          <span>•</span>
          <time>{format(new Date(message.timestamp), 'HH:mm')}</time>
        </div>

        {/* Original text indicator */}
        {message.translated && (
          <div className={`absolute ${
            isOwn ? '-left-20' : '-right-20'
          } top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}>
            <span className="text-xs text-gray-500">
              {showOriginal ? 'Showing original' : 'Hover to see original'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageComponent