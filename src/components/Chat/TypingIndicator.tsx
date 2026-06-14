import { useEffect, useState } from 'react'

interface TypingIndicatorProps {
  isTyping: boolean
  label?: string
}

export const TypingIndicator = ({ isTyping, label }: TypingIndicatorProps) => {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isTyping) {
      setShow(true)
    } else {
      // Hide indicator after 1.5s of no typing
      const timer = setTimeout(() => setShow(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [isTyping])

  if (!show) return null

  return (
    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
      <div className="flex items-center space-x-2">
        <span>{label ? `${label} is typing...` : 'Typing...'}</span>
        <span className="flex space-x-1">
          <span className="animate-bounce">.</span>
          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
        </span>
      </div>
    </div>
  )
}