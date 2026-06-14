import { useState } from 'react'
import { SwatchIcon } from '@heroicons/react/24/outline'

interface ThemeSettingsProps {
  onThemeChange: (isDark: boolean) => void
  onAccentColorChange: (color: string) => void
  onBubbleStyleChange: (style: 'rounded' | 'rectangular') => void
  currentTheme: 'light' | 'dark'
  currentAccentColor: string
  currentBubbleStyle: 'rounded' | 'rectangular'
}

const ACCENT_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F97316' },
]

export const ThemeSettings = ({
  onThemeChange,
  onAccentColorChange,
  onBubbleStyleChange,
  currentTheme,
  currentAccentColor,
  currentBubbleStyle,
}: ThemeSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleThemeChange = (isDark: boolean) => {
    onThemeChange(isDark)
    // Save to localStorage
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  const handleAccentColorChange = (color: string) => {
    onAccentColorChange(color)
    // Save to localStorage
    localStorage.setItem('accentColor', color)
  }

  const handleBubbleStyleChange = (style: 'rounded' | 'rectangular') => {
    onBubbleStyleChange(style)
    // Save to localStorage
    localStorage.setItem('bubbleStyle', style)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        aria-label="Theme settings"
      >
        <SwatchIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-4">
          {/* Theme Toggle */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white">Theme</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleThemeChange(false)}
                className={`px-3 py-1 rounded ${
                  currentTheme === 'light'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => handleThemeChange(true)}
                className={`px-3 py-1 rounded ${
                  currentTheme === 'dark'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Accent Colors */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white">Accent Color</h3>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleAccentColorChange(color.value)}
                  className={`w-6 h-6 rounded-full ${
                    currentAccentColor === color.value ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Bubble Style */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-white">Bubble Style</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleBubbleStyleChange('rounded')}
                className={`px-3 py-1 rounded-2xl ${
                  currentBubbleStyle === 'rounded'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Rounded
              </button>
              <button
                onClick={() => handleBubbleStyleChange('rectangular')}
                className={`px-3 py-1 rounded ${
                  currentBubbleStyle === 'rectangular'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Rectangular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}