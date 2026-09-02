import { defineStore } from 'pinia'
import {
  AUTH_MODE,
  fetchProfile,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  type LoginPayload,
  type UserInfo
} from '@/api/auth'

const TOKEN_KEY = 'wb.token'
const USER_KEY = 'wb.user'

interface AuthState {
  token: string | null
  user: UserInfo | null
  loading: boolean
  error: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem(TOKEN_KEY),
    user: JSON.parse(localStorage.getItem(USER_KEY) || 'null') as UserInfo | null,
    loading: false,
    error: null
  }),

  getters: {
    isLogin: (s) => !!s.token && !!s.user,
    isAdmin: (s) => s.user?.role === 'admin',
    mode: () => AUTH_MODE,
    displayName: (s) => s.user?.displayName || s.user?.username || '未登录'
  },

  actions: {
    async login(payload: LoginPayload) {
      this.loading = true
      this.error = null
      try {
        const res = await apiLogin(payload)
        this.token = res.token
        this.user = res.user
        localStorage.setItem(TOKEN_KEY, res.token)
        localStorage.setItem(USER_KEY, JSON.stringify(res.user))
        return true
      } catch (err) {
        this.error = (err as Error).message
        return false
      } finally {
        this.loading = false
      }
    },

    async register(payload: LoginPayload & { displayName?: string }) {
      this.loading = true
      this.error = null
      try {
        const res = await apiRegister(payload)
        this.token = res.token
        this.user = res.user
        localStorage.setItem(TOKEN_KEY, res.token)
        localStorage.setItem(USER_KEY, JSON.stringify(res.user))
        return true
      } catch (err) {
        this.error = (err as Error).message
        return false
      } finally {
        this.loading = false
      }
    },

    async loadProfile() {
      if (!this.token) return
      const profile = await fetchProfile()
      if (profile) {
        this.user = profile
        localStorage.setItem(USER_KEY, JSON.stringify(profile))
      } else {
        this.clear()
      }
    },

    async logout() {
      await apiLogout()
      this.clear()
    },

    clear() {
      this.token = null
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  }
})
