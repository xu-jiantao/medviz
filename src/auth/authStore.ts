import { create } from 'zustand'
import { idbGet, idbSet, idbDel } from './idb'
import { hashPassword, verifyPassword } from './crypto'

export interface StoredUser {
  username: string
  email: string
  salt: string
  hash: string
  createdAt: string
  // 密保问题（用于忘记密码找回，可选）
  question?: string
  answerSalt?: string
  answerHash?: string
}

const normAnswer = (a: string) => a.trim().toLowerCase()

export interface CurrentUser {
  username: string
  email: string
}

interface AuthState {
  currentUser: CurrentUser | null
  ready: boolean
  init: () => Promise<void>
  register: (p: { username: string; email: string; password: string; question?: string; answer?: string }) => Promise<void>
  login: (p: { username: string; password: string }) => Promise<void>
  demoLogin: () => Promise<void>
  changePassword: (p: { oldPassword: string; newPassword: string }) => Promise<void>
  getSecurityQuestion: (username: string) => Promise<string | null>
  resetPassword: (p: { username: string; answer: string; newPassword: string }) => Promise<void>
  logout: () => Promise<void>
}

const userKey = (username: string) => `user:${username.toLowerCase()}`
const SESSION_KEY = 'session'

// 内置演示账号，测试时免注册直接登录
export const DEMO = { username: 'demo', email: 'demo@medviz.app', password: 'demo1234' }

/** 确保演示账号存在（幂等，不影响当前会话） */
async function ensureDemo() {
  const k = userKey(DEMO.username)
  if (await idbGet<StoredUser>(k)) return
  const { hash, salt } = await hashPassword(DEMO.password)
  await idbSet(k, { username: DEMO.username, email: DEMO.email, salt, hash, createdAt: new Date().toISOString() })
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  ready: false,

  init: async () => {
    await ensureDemo() // 每次启动确保演示账号可用
    const session = await idbGet<{ username: string }>(SESSION_KEY)
    if (session?.username) {
      const u = await idbGet<StoredUser>(userKey(session.username))
      if (u) {
        set({ currentUser: { username: u.username, email: u.email } })
      }
    }
    set({ ready: true })
  },

  register: async ({ username, email, password, question, answer }) => {
    username = username.trim()
    if (!username) throw new Error('请输入用户名')
    const exists = await idbGet<StoredUser>(userKey(username))
    if (exists) throw new Error('该用户名已被注册')
    const { hash, salt } = await hashPassword(password)
    const user: StoredUser = { username, email: email.trim(), salt, hash, createdAt: new Date().toISOString() }
    if (question && answer) {
      const a = await hashPassword(normAnswer(answer))
      user.question = question.trim()
      user.answerHash = a.hash
      user.answerSalt = a.salt
    }
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

  demoLogin: async () => {
    await ensureDemo()
    await get().login({ username: DEMO.username, password: DEMO.password })
  },

  changePassword: async ({ oldPassword, newPassword }) => {
    const cur = get().currentUser
    if (!cur) throw new Error('请先登录')
    const u = await idbGet<StoredUser>(userKey(cur.username))
    if (!u) throw new Error('账号不存在')
    if (!(await verifyPassword(oldPassword, u.salt, u.hash))) throw new Error('原密码错误')
    if (newPassword.length < 6) throw new Error('新密码至少 6 位')
    const { hash, salt } = await hashPassword(newPassword)
    await idbSet(userKey(cur.username), { ...u, hash, salt })
  },

  getSecurityQuestion: async (username) => {
    const u = await idbGet<StoredUser>(userKey(username.trim()))
    if (!u) throw new Error('用户名不存在')
    return u.question ?? null
  },

  resetPassword: async ({ username, answer, newPassword }) => {
    username = username.trim()
    const u = await idbGet<StoredUser>(userKey(username))
    if (!u) throw new Error('用户名不存在')
    if (!u.question || !u.answerHash || !u.answerSalt) throw new Error('该账号未设置密保问题，无法找回')
    if (!(await verifyPassword(normAnswer(answer), u.answerSalt, u.answerHash))) throw new Error('密保答案不正确')
    if (newPassword.length < 6) throw new Error('新密码至少 6 位')
    const { hash, salt } = await hashPassword(newPassword)
    await idbSet(userKey(username), { ...u, hash, salt })
    // 重置后自动登录
    await idbSet(SESSION_KEY, { username: u.username })
    set({ currentUser: { username: u.username, email: u.email } })
  },

  logout: async () => {
    await idbDel(SESSION_KEY)
    set({ currentUser: null })
  },
}))
