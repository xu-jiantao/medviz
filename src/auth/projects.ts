import { idbGet, idbSet } from './idb'
import { gatherProject, applyProject, type MedvizProject } from '@/export/projectIO'

export interface SavedProject {
  id: string
  name: string
  savedAt: string
  data: MedvizProject
}

const key = (username: string) => `projects:${username.toLowerCase()}`
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export async function listProjects(username: string): Promise<SavedProject[]> {
  return (await idbGet<SavedProject[]>(key(username))) ?? []
}

/** 用给定列表整体替换该用户的本地项目（云同步「从云恢复」用） */
export async function replaceProjects(username: string, list: SavedProject[]): Promise<void> {
  await idbSet(key(username), list)
}

/** 把当前四图配置存为该用户的一个命名项目 */
export async function saveCurrentProject(username: string, name: string): Promise<SavedProject> {
  const list = await listProjects(username)
  const proj: SavedProject = { id: uid(), name: name.trim() || '未命名', savedAt: new Date().toISOString(), data: gatherProject() }
  list.unshift(proj)
  await idbSet(key(username), list)
  return proj
}

export async function loadProject(username: string, id: string): Promise<void> {
  const list = await listProjects(username)
  const proj = list.find((p) => p.id === id)
  if (!proj) throw new Error('项目不存在')
  applyProject(proj.data)
}

export async function deleteProject(username: string, id: string): Promise<void> {
  const list = await listProjects(username)
  await idbSet(key(username), list.filter((p) => p.id !== id))
}

/** 覆盖保存（用当前配置更新已有项目） */
export async function overwriteProject(username: string, id: string): Promise<void> {
  const list = await listProjects(username)
  const idx = list.findIndex((p) => p.id === id)
  if (idx < 0) throw new Error('项目不存在')
  list[idx] = { ...list[idx], savedAt: new Date().toISOString(), data: gatherProject() }
  await idbSet(key(username), list)
}
