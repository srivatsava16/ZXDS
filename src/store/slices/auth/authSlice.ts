import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { User, LoginCredentials, LoginResponse } from '../../../@types/api'
import { apiService } from '../../../services/base/apiService'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('authToken'),
  isAuthenticated: !!localStorage.getItem('authToken'),
  isLoading: false,
  error: null,
}

// Async thunks
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await apiService.post<LoginResponse>('/auth/login', credentials)
      
      if (response?.success && response?.data?.token) {
        localStorage.setItem('authToken', response.data.token)
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken)
        }
        return response.data
      }
      
      throw new Error(response?.message || 'Login failed')
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed')
    }
  }
)

export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await apiService.post('/auth/logout')
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
    }
  }
)

export const refreshTokenAsync = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await apiService.post<LoginResponse>('/auth/refresh', {
        refreshToken,
      })
      
      if (response?.success && response?.data?.token) {
        localStorage.setItem('authToken', response.data.token)
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken)
        }
        return response.data
      }
      
      throw new Error(response?.message || 'Token refresh failed')
    } catch (error) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed')
    }
  }
)

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
    },
    clearAuth: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload?.user || null
        state.token = action.payload?.token || null
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      // Logout
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.error = null
      })
      // Refresh Token
      .addCase(refreshTokenAsync.fulfilled, (state, action) => {
        state.user = action.payload?.user || state.user
        state.token = action.payload?.token || null
        state.isAuthenticated = true
      })
      .addCase(refreshTokenAsync.rejected, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
      })
  },
})

export const { clearError, setUser, clearAuth } = authSlice.actions

export default authSlice.reducer