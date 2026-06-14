import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../context/ThemeContext'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
]

const Settings = () => {
  const { theme, toggleTheme } = useTheme()
  const [language, setLanguage] = useState('en')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-12 px-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Theme */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Theme</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Choose your preferred theme</p>
              <p className="text-sm text-gray-500 mt-1">
                Currently using {theme} mode
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Toggle theme
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Language</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="language" className="block text-gray-600 mb-2">
                Preferred Language
              </label>
              <div className="relative">
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Messages will be translated to this language
              </p>
            </div>

            <div className="pt-4 border-t">
              <label className="block text-gray-600 mb-2">
                Translation Settings
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    defaultChecked
                  />
                  <span className="ml-2 text-gray-600">
                    Auto-translate incoming messages
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    defaultChecked
                  />
                  <span className="ml-2 text-gray-600">
                    Show original message on hover
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings