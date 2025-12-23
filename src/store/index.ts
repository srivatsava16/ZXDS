import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/auth/authSlice.ts'
import themeSlice from './slices/theme/themeSlice.ts'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    theme: themeSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch