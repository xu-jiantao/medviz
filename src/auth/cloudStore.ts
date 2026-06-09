import { create } from 'zustand'
import { cloudLogin, cloudRegister, type CloudUser } from './cloudClient'

const LS_KEY = 'medviz-cloud'

interface Persisted {
  backendUrl: string
  token: string | null
  user: CloudUser | null
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { backendUrl: 'http://localhost:8000', token: null, user: null }
}

function save(p: Persisted) {
  localStorage.setItem(LS_KEY, JSON.stringify(p))
}

interface CloudState extends Persisted {
  setBackendUrl: (url: string) => void
  register: (p: { username: string; email: string; password: string }) => Promise<void>
  login: (p: { username: string; password: string }) => Promise<void>
  logout: () => void
}

export const useCloudStore = create<CloudState>((set, get) => ({
  ...load(),

  setBackendUrl: (backendUrl) => {
    set({ backendUrl })
    save({ ...get(), backendUrl })
  },

  register: async (p) => {
    const { token, user } = await cloudRegister(get().backendUrl, p)
    set({ token, user })
    save({ backendUrl: get().backendUrl, token, user })
  },

  login: async (p) => {
    const { token, user } = await cloudLogin(get().backendUrl, p)
    set({ token, user })
    save({ backendUrl: get().backendUrl, token, user })
  },

  logout: () => {
    set({ token: null, user: null })
    save({ backendUrl: get().backendUrl, token: null, user: null })
  },
}))
