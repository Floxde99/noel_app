"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'

type FontSize = 'small' | 'normal' | 'large' | 'xlarge'

interface FontSizeContextType {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
}

const fontSizes: FontSize[] = ['small', 'normal', 'large', 'xlarge']

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined)

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>('normal')

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size)
    document.documentElement.classList.remove('text-size-small', 'text-size-normal', 'text-size-large', 'text-size-xlarge')
    document.documentElement.classList.add(`text-size-${size}`)
  }, [])

  const increaseFontSize = useCallback(() => {
    const currentIndex = fontSizes.indexOf(fontSize)
    if (currentIndex < fontSizes.length - 1) {
      setFontSize(fontSizes[currentIndex + 1])
    }
  }, [fontSize, setFontSize])

  const decreaseFontSize = useCallback(() => {
    const currentIndex = fontSizes.indexOf(fontSize)
    if (currentIndex > 0) {
      setFontSize(fontSizes[currentIndex - 1])
    }
  }, [fontSize, setFontSize])

  return (
    <FontSizeContext.Provider
      value={{
        fontSize,
        setFontSize,
        increaseFontSize,
        decreaseFontSize,
      }}
    >
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize() {
  const context = useContext(FontSizeContext)
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider')
  }
  return context
}
