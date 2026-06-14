import { createContext, useContext, useState, useEffect } from 'react'
import type { Theme } from '../types'

type ThemeContextType = {
  theme: Theme['mode']
  accentColor: string
  bubbleStyle: 'rounded' | 'rectangular'
  toggleTheme: () => void
  setAccentColor: (color: string) => void
  setBubbleStyle: (style: 'rounded' | 'rectangular') => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  accentColor: '#3B82F6',
  bubbleStyle: 'rounded',
  toggleTheme: () => {},
  setAccentColor: () => {},
  setBubbleStyle: () => {}
})

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme['mode']>(() => {
    const savedTheme = localStorage.getItem('transend_theme') as Theme['mode'] | null
    return savedTheme === 'dark' ? 'dark' : 'light'
  })
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('accentColor') || '#3B82F6'
  })
  const [bubbleStyle, setBubbleStyle] = useState<'rounded' | 'rectangular'>(() => {
    return (localStorage.getItem('bubbleStyle') as 'rounded' | 'rectangular') || 'rounded'
  })

  useEffect(() => {
    localStorage.setItem('transend_theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  const handleAccentColorChange = (color: string) => {
    setAccentColor(color)
    localStorage.setItem('accentColor', color)
    document.documentElement.style.setProperty('--accent-color', color)
  }

  const handleBubbleStyleChange = (style: 'rounded' | 'rectangular') => {
    setBubbleStyle(style)
    localStorage.setItem('bubbleStyle', style)
  }

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor)
  }, [])

  return (
    <ThemeContext.Provider value={{
      theme,
      accentColor,
      bubbleStyle,
      toggleTheme,
      setAccentColor: handleAccentColorChange,
      setBubbleStyle: handleBubbleStyleChange
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}