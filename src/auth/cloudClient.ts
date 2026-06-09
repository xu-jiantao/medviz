import type { SavedProject } from './projects'

// 对接后端 backend/app.py 的 /auth 与 /cloud 接口

const base = (url: string) => url.replace(/\/$/, '')

async function req<T>(url: string, method: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error((d as { detail?: string }).detail ?? `请求失败 (${res.status})`)
  }
  return res.json()
}

export interface CloudUser {
  username: string
  email: string
}
interface AuthResp {
  token: string
  user: CloudUser
}

export const cloudRegister = (baseUrl: string, p: { username: string; email: string; password: string }) =>
  req<AuthResp>(`${base(baseUrl)}/auth/register`, 'POST', p)

export const cloudLogin = (baseUrl: string, p: { username: string; password: string }) =>
  req<AuthResp>(`${base(baseUrl)}/auth/login`, 'POST', p)

export const cloudGetProjects = (baseUrl: string, token: string) =>
  req<{ projects: SavedProject[] }>(`${base(baseUrl)}/cloud/projects`, 'GET', undefined, token)

export const cloudPutProjects = (baseUrl: string, token: string, projects: SavedProject[]) =>
  req<{ ok: boolean; updated: string; count: number }>(`${base(baseUrl)}/cloud/projects`, 'PUT', { projects }, token)

export const cloudChangePassword = (baseUrl: string, token: string, oldPassword: string, newPassword: string) =>
  req<{ ok: boolean }>(`${base(baseUrl)}/auth/change-password`, 'POST', { oldPassword, newPassword }, token)
