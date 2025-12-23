import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type ThemeMode = 'light' | 'dark'
export type ThemeColor = 'blue' | 'green' | 'purple' | 'orange' | 'red'

interface ThemeState {
  mode: ThemeMode
  primaryColor: ThemeColor
  isCompact: boolean
  sidebarCollapsed: boolean
}

const getInitialTheme = (): ThemeState => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    try {
      return JSON.parse(savedTheme)
    } catch (error) {
      console.warn('Failed to parse saved theme:', error)
    }
  }

  return {
    mode: 'light',
    primaryColor: 'blue',
    isCompact: false,
    sidebarCollapsed: false,
  }
}

const initialState: ThemeState = getInitialTheme()

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleThemeMode: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', JSON.stringify(state))
    },
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload
      localStorage.setItem('theme', JSON.stringify(state))
    },
    setPrimaryColor: (state, action: PayloadAction<ThemeColor>) => {
      state.primaryColor = action.payload
      localStorage.setItem('theme', JSON.stringify(state))
    },
    toggleCompactMode: (state) => {
      state.isCompact = !state.isCompact
      localStorage.setItem('theme', JSON.stringify(state))
    },
    setCompactMode: (state, action: PayloadAction<boolean>) => {
      state.isCompact = action.payload
      localStorage.setItem('theme', JSON.stringify(state))
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
      localStorage.setItem('theme', JSON.stringify(state))
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload
      localStorage.setItem('theme', JSON.stringify(state))
    },
    resetTheme: (state) => {
      const defaultTheme = {
        mode: 'light' as ThemeMode,
        primaryColor: 'blue' as ThemeColor,
        isCompact: false,
        sidebarCollapsed: false,
      }
      Object.assign(state, defaultTheme)
      localStorage.setItem('theme', JSON.stringify(state))
    },
  },
})

export const {
  toggleThemeMode,
  setThemeMode,
  setPrimaryColor,
  toggleCompactMode,
  setCompactMode,
  toggleSidebar,
  setSidebarCollapsed,
  resetTheme,
} = themeSlice.actions

export default themeSlice.reducer