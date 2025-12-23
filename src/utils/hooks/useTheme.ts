import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './reduxHooks';
import {
  toggleThemeMode,
  setThemeMode,
  setPrimaryColor,
  toggleCompactMode,
  toggleSidebar,
  resetTheme,
} from '../../store/slices/theme/themeSlice'
import type { ThemeMode, ThemeColor } from '../../store/slices/theme/themeSlice'

export const useTheme = () => {
  const dispatch = useAppDispatch()
  const theme = useAppSelector((state) => state.theme as { mode?: ThemeMode; primaryColor?: ThemeColor; isCompact?: boolean; sidebarCollapsed?: boolean });

  const toggleMode = useCallback(() => {
    dispatch(toggleThemeMode())
  }, [dispatch])

  const setMode = useCallback(
    (mode: ThemeMode) => {
      dispatch(setThemeMode(mode))
    },
    [dispatch]
  )

  const setColor = useCallback(
    (color: ThemeColor) => {
      dispatch(setPrimaryColor(color))
    },
    [dispatch]
  )

  const toggleCompact = useCallback(() => {
    dispatch(toggleCompactMode())
  }, [dispatch])

  const toggleSidebarCollapse = useCallback(() => {
    dispatch(toggleSidebar())
  }, [dispatch])

  const reset = useCallback(() => {
    dispatch(resetTheme())
  }, [dispatch])

  return {
    mode: theme?.mode,
    primaryColor: theme?.primaryColor,
    isCompact: theme?.isCompact,
    sidebarCollapsed: theme?.sidebarCollapsed,
    toggleMode,
    setMode,
    setColor,
    toggleCompact,
    toggleSidebarCollapse,
    reset,
  }
}