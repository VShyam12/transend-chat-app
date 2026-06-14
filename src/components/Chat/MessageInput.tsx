import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { EmojiPicker } from './EmojiPicker';
import { FileUpload } from './FileUpload';
import { useTheme } from '../../context/ThemeContext';

interface MessageInputProps {
  onSend: (content: { text: string; file?: File }) => void;
  onTyping?: (isTyping: boolean) => void;
}

export const MessageInput = ({ onSend, onTyping }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { accentColor } = useTheme();

  const handleTyping = () => {
    if (onTyping) {
      onTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const newMessage = message.slice(0, start) + emoji + message.slice(end);
    
    setMessage(newMessage);
    
    // Set cursor position after emoji
    setTimeout(() => {
      input.selectionStart = input.selectionEnd = start + emoji.length;
      input.focus();
    }, 0);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;

    onSend({
      text: message.trim(),
      file: selectedFile || undefined
    });

    setMessage('');
    setSelectedFile(null);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
      <div className="flex items-center gap-3 max-w-full">
        <div className="flex items-center gap-2">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          <FileUpload onFileSelect={handleFileSelect} />
        </div>

        <div className="flex-1">
          <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-full px-3 py-2 gap-3">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Type a message..."
              className="flex-1 resize-none bg-transparent p-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
              rows={1}
            />

            <button
              type="submit"
              disabled={!message.trim() && !selectedFile}
              className="w-10 h-10 rounded-full text-white flex items-center justify-center transition-colors disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              <PaperAirplaneIcon className="w-5 h-5 rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};