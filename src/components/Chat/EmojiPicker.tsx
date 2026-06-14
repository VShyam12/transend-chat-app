import { useState } from 'react';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';
import { FaceSmileIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../context/ThemeContext';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const { theme } = useTheme();

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setShowPicker(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        title="Add emoji"
      >
        <FaceSmileIcon className="w-5 h-5" />
      </button>

      {showPicker && (
        <div className="absolute bottom-full mb-2 z-50">
          <div className="shadow-lg rounded-lg overflow-hidden">
            <EmojiPickerReact
              onEmojiClick={handleEmojiClick}
              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
              lazyLoadEmojis={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};