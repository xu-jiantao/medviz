import { create } from 'zustand'
import { idbGet, idbSet, idbDel, idbKeys } from './idb'
import { hashPassword, verifyPassword } from './crypto'

export type Role = 'admin' | 'doctor' | 'user'

export interface StoredUser {
  username: string
  email: string
  salt: string
  hash: string
  role: Role
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
  role: Role
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

// 内置三种角色的演示账号
export const SEED_ACCOUNTS: { username: string; password: string; email: string; role: Role; label: string }[] = [
  { username: 'admin', password: 'admin1234', email: 'admin@medviz.app', role: 'admin', label: '管理员' },
  { username: 'doctor', password: 'doctor1234', email: 'doctor@medviz.app', role: 'doctor', label: '医生' },
  { username: 'demo', password: 'demo1234', email: 'demo@medviz.app', role: 'user', label: '普通用户' },
]
export const DEMO = SEED_ACCOUNTS[2] // 默认一键登录用普通用户

/** 确保演示账号存在（幂等，不影响当前会话） */
async function ensureSeedAccounts() {
  for (const a of SEED_ACCOUNTS) {
    const k = userKey(a.username)
    if (await idbGet<StoredUser>(k)) continue
    const { hash, salt } = await hashPassword(a.password)
    await idbSet(k, {
      username: a.username, email: a.email, salt, hash, role: a.role,
      createdAt: new Date().toISOString(),
    } as StoredUser)
  }
}

/** 列出所有账号（管理员/医生汇总用） */
export async function listUsers(): Promise<StoredUser[]> {
  const keys = await idbKeys('user:')
  const users = await Promise.all(keys.map((k) => idbGet<StoredUser>(k as string)))
  return users.filter((u): u is StoredUser => !!u)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  ready: false,

  init: async () => {
    await ensureSeedAccounts() // 每次启动确保演示账号可用
    const session = await idbGet<{ username: string }>(SESSION_KEY)
    if (session?.username) {
      const u = await idbGet<StoredUser>(userKey(session.username))
      if (u) {
        set({ currentUser: { username: u.username, email: u.email, role: u.role ?? 'user' } })
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
    const user: StoredUser = { username, email: email.trim(), salt, hash, role: 'user', createdAt: new Date().toISOString() }
    if (question && answer) {
      const a = await hashPassword(normAnswer(answer))
      user.question = question.trim()
      user.answerHash = a.hash
      user.answerSalt = a.salt
    }
    await idbSet(userKey(username), user)
    await idbSet(SESSION_KEY, { username })
    set({ currentUser: { username, email: user.email, role: user.role } })
  },

  login: async ({ username, password }) => {
    username = username.trim()
    const u = await idbGet<StoredUser>(userKey(username))
    if (!u) throw new Error('用户名不存在')
    const ok = await verifyPassword(password, u.salt, u.hash)
    if (!ok) throw new Error('密码错误')
    await idbSet(SESSION_KEY, { username: u.username })
    set({ currentUser: { username: u.username, email: u.email, role: u.role ?? 'user' } })
  },

  demoLogin: async () => {
    await ensureSeedAccounts()
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
    set({ currentUser: { username: u.username, email: u.email, role: u.role ?? 'user' } })
  },

  logout: async () => {
    await idbDel(SESSION_KEY)
    set({ currentUser: null })
  },
}))
