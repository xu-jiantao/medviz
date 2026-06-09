import { create } from 'zustand'
import { idbGet, idbSet, idbDel } from './idb'
import { hashPassword, verifyPassword } from './crypto'

export interface StoredUser {
  username: string
  email: string
  salt: string
  hash: string
  createdAt: string
}

export interface CurrentUser {
  username: string
  email: string
}

interface AuthState {
  currentUser: CurrentUser | null
  ready: boolean
  init: () => Promise<void>
  register: (p: { username: string; email: string; password: string }) => Promise<void>
  login: (p: { username: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const userKey = (username: string) => `user:${username.toLowerCase()}`
const SESSION_KEY = 'session'

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  ready: false,

  init: async () => {
    const session = await idbGet<{ username: string }>(SESSION_KEY)
    if (session?.username) {
      const u = await idbGet<StoredUser>(userKey(session.username))
      if (u) {
        set({ currentUser: { username: u.username, email: u.email } })
      }
    }
    set({ ready: true })
  },

  register: async ({ username, email, password }) => {
    username = username.trim()
    if (!username) throw new Error('请输入用户名')
    const exists = await idbGet<StoredUser>(userKey(username))
    if (exists) throw new Error('该用户名已被注册')
    const { hash, salt } = await hashPassword(password)
    const user: StoredUser = { username, email: email.trim(), salt, hash, createdAt: new Date().toISOString() }
    await idbSet(userKey(username), user)
    await idbSet(SESSION_KEY, { username })
    set({ currentUser: { username, email: user.email } })
  },

  login: async ({ username, password }) => {
    username = username.trim()
    const u = await idbGet<StoredUser>(userKey(username))
    if (!u) throw new Error('用户名不存在')
    const ok = await verifyPassword(password, u.salt, u.hash)
    if (!ok) throw new Error('密码错误')
    await idbSet(SESSION_KEY, { username: u.username })
    set({ currentUser: { username: u.username, email: u.email } })
  },

  logout: async () => {
    await idbDel(SESSION_KEY)
    set({ currentUser: null })
  },
}))
