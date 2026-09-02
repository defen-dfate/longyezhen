/* ============================================================
 * 认证接口层 —— 支持两种模式
 *   mock（默认）：前端模拟，账号存本地，适合 GitHub Pages 纯静态部署
 *   api        ：对接真实后端，只需配置 VITE_AUTH_MODE=api 与 VITE_API_BASE
 * 业务代码只调用本模块，切换模式无需改动任何页面
 * ============================================================ */
import { http } from './http'

export type AuthMode = 'mock' | 'api'

export const AUTH_MODE: AuthMode =
  (import.meta.env.VITE_AUTH_MODE as AuthMode) || 'mock'
export const API_BASE: string = import.meta.env.VITE_API_BASE || ''

export interface UserInfo {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'user'
  email?: string
  createdAt?: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  user: UserInfo
  mode: AuthMode
}

/* ---------------- mock 模式 ---------------- */
const USERS_KEY = 'wb.users'
const DEMO_ACCOUNTS: Array<LoginPayload & Omit<UserInfo, 'id' | 'createdAt'>> = [
  {
    username: 'admin',
    password: 'admin123',
    displayName: '系统管理员',
    role: 'admin',
    email: 'admin@workbench.local'
  }
]

async function sha256(text: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // 极简兜底（无 crypto.subtle 的 http 环境）
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h << 5) - h + text.charCodeAt(i) | 0
  return 'f' + (h >>> 0).toString(16)
}

interface StoredUser {
  id: string
  username: string
  passwordHash: string
  displayName: string
  role: 'admin' | 'user'
  email?: string
  createdAt: string
}

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]') as StoredUser[]
  } catch {
    return []
  }
}

function writeUsers(list: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list))
}

async function ensureSeed() {
  const list = readUsers()
  let dirty = false
  for (const acc of DEMO_ACCOUNTS) {
    if (!list.some((u) => u.username === acc.username)) {
      list.push({
        id: 'u_' + acc.username,
        username: acc.username,
        passwordHash: await sha256(acc.password),
        displayName: acc.displayName,
        role: acc.role,
        email: acc.email,
        createdAt: new Date().toISOString()
      })
      dirty = true
    }
  }
  if (dirty) writeUsers(list)
}

function makeToken(user: StoredUser): string {
  const payload = btoa(
    unescape(encodeURIComponent(JSON.stringify({ sub: user.username, role: user.role })))
  )
  return `mock.${payload}.${Date.now().toString(36)}`
}

function toUserInfo(u: StoredUser): UserInfo {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    email: u.email,
    createdAt: u.createdAt
  }
}

async function mockLogin(p: LoginPayload): Promise<LoginResult> {
  await ensureSeed()
  const hash = await sha256(p.password)
  const list = readUsers()
  const found = list.find((u) => u.username === p.username.trim())
  if (!found || found.passwordHash !== hash) {
    throw new Error('账号或密码不正确')
  }
  return { token: makeToken(found), user: toUserInfo(found), mode: 'mock' }
}

export async function mockRegister(
  p: LoginPayload & { displayName?: string }
): Promise<LoginResult> {
  await ensureSeed()
  const username = p.username.trim()
  if (username.length < 3) throw new Error('账号至少 3 个字符')
  if (p.password.length < 6) throw new Error('密码至少 6 位')
  const list = readUsers()
  if (list.some((u) => u.username === username)) throw new Error('该账号已存在')
  const user: StoredUser = {
    id: 'u_' + Date.now().toString(36),
    username,
    passwordHash: await sha256(p.password),
    displayName: p.displayName || username,
    role: 'user',
    createdAt: new Date().toISOString()
  }
  list.push(user)
  writeUsers(list)
  return { token: makeToken(user), user: toUserInfo(user), mode: 'mock' }
}

/* ---------------- 对外统一入口 ---------------- */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  if (AUTH_MODE === 'api') {
    const res = await http.post<{ token: string; user?: UserInfo }>('/auth/login', payload)
    const user: UserInfo = res.user || {
      id: payload.username,
      username: payload.username,
      displayName: payload.username,
      role: 'user'
    }
    return { token: res.token, user, mode: 'api' }
  }
  return mockLogin(payload)
}

export async function register(
  payload: LoginPayload & { displayName?: string }
): Promise<LoginResult> {
  if (AUTH_MODE === 'api') {
    const res = await http.post<{ token: string; user?: UserInfo }>('/auth/register', payload)
    return {
      token: res.token,
      user: res.user || {
        id: payload.username,
        username: payload.username,
        displayName: payload.displayName || payload.username,
        role: 'user'
      },
      mode: 'api'
    }
  }
  return mockRegister(payload)
}

export async function fetchProfile(): Promise<UserInfo | null> {
  if (AUTH_MODE === 'api') {
    try {
      return await http.get<UserInfo>('/auth/profile')
    } catch {
      return null
    }
  }
  const token = localStorage.getItem('wb.token')
  if (!token) return null
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1]))))
    const u = readUsers().find((x) => x.username === payload.sub)
    return u ? toUserInfo(u) : null
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  if (AUTH_MODE === 'api') {
    try {
      await http.post('/auth/logout')
    } catch {
      /* 后端不可用时仍要清理本地态 */
    }
  }
}

/** 当前是否已接入真实后端 */
export const isBackendMode = AUTH_MODE === 'api'
