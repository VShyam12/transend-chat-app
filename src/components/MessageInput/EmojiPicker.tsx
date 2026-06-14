import { useState } from 'react'
import EmojiPickerReact from 'emoji-picker-react'
import { FaceSmileIcon } from '@heroicons/react/24/outline'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
}

export const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        aria-label="Open emoji picker"
      >
        <FaceSmileIcon className="w-5 h-5" />
      </button>

      {showPicker && (
        <div className="absolute bottom-full mb-2">
          <div className="shadow-lg rounded-lg overflow-hidden">
            <EmojiPickerReact
              onEmojiClick={(emojiData) => {
                onEmojiSelect(emojiData.emoji)
                setShowPicker(false)
              }}
              lazyLoadEmojis
            />
          </div>
        </div>
      )}
    </div>
  )
}