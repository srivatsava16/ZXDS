import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from './reduxHooks'
import { loginAsync, logoutAsync, clearError } from '../../store/slices/auth/authSlice'
import type { LoginCredentials } from '../../@types/api'

export const useAuth = () => {
  const dispatch = useAppDispatch()
  const { user, token, isAuthenticated, isLoading, error } = useAppSelector(
    (state) => state.auth
  )

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const result = await dispatch(loginAsync(credentials))
        if (loginAsync.fulfilled.match(result)) {
          return result.payload
        }
        throw new Error(result.payload as string)
      } catch (error) {
        throw error
      }
    },
    [dispatch]
  )

  const logout = useCallback(async () => {
    await dispatch(logoutAsync())
  }, [dispatch])

  const clearAuthError = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError: clearAuthError,
  }
}