import { create } from 'zustand'
import { idbGet, idbSet } from './idb'
import type { Role } from './authStore'

// 受控功能列表（超管可按角色开关）。图表浏览始终允许。
export const FEATURES: { key: string; label: string }[] = [
  { key: 'export', label: '导出（Excel/PDF/项目）' },
  { key: 'cloud', label: '云同步' },
  { key: 'fit', label: '从数据拟合' },
  { key: 'patients', label: '病人管理' },
  { key: 'aggregate', label: '数据汇总导出' },
]

export type LimitMode = 'permanent' | 'hours' | 'days'
export interface UserLimit {
  mode: LimitMode
  value?: number // hours 或 days 的数量
}

export interface Acl {
  // 按用户名的使用时长限制
  userLimits: Record<string, UserLimit>
  // 限时计时起点（首次登录时间）
  firstLoginAt: Record<string, string>
  // 硬禁用
  disabled: Record<string, boolean>
  // 按角色的功能权限：role -> featureKey -> 允许
  rolePerms: Record<Role, Record<string, boolean>>
}

const ACL_KEY = 'acl'

function defaultAcl(): Acl {
  const all = Object.fromEntries(FEATURES.map((f) => [f.key, true]))
  return {
    userLimits: {},
    firstLoginAt: {},
    disabled: {},
    rolePerms: {
      superadmin: { ...all },
      admin: { ...all },
      doctor: { ...all },
      user: { export: true, cloud: true, fit: false, patients: false, aggregate: false },
    },
  }
}

interface AclState {
  acl: Acl
  load: () => Promise<void>
  save: (acl: Acl) => Promise<void>
  setUserLimit: (username: string, limit: UserLimit) => Promise<void>
  setDisabled: (username: string, disabled: boolean) => Promise<void>
  resetClock: (username: string) => Promise<void>
  setRolePerm: (role: Role, feature: string, allowed: boolean) => Promise<void>
}

export const useAclStore = create<AclState>((set, get) => ({
  acl: defaultAcl(),
  load: async () => {
    const saved = await idbGet<Acl>(ACL_KEY)
    if (saved) {
      // 合并默认值，避免新增字段缺失
      const d = defaultAcl()
      set({
        acl: {
          userLimits: saved.userLimits ?? {},
          firstLoginAt: saved.firstLoginAt ?? {},
          disabled: saved.disabled ?? {},
          rolePerms: { ...d.rolePerms, ...(saved.rolePerms ?? {}) },
        },
      })
    }
  },
  save: async (acl) => {
    set({ acl })
    await idbSet(ACL_KEY, acl)
  },
  setUserLimit: async (username, limit) => {
    const acl = { ...get().acl, userLimits: { ...get().acl.userLimits, [username]: limit } }
    await get().save(acl)
  },
  setDisabled: async (username, disabled) => {
    const acl = { ...get().acl, disabled: { ...get().acl.disabled, [username]: disabled } }
    await get().save(acl)
  },
  resetClock: async (username) => {
    const firstLoginAt = { ...get().acl.firstLoginAt }
    delete firstLoginAt[username]
    await get().save({ ...get().acl, firstLoginAt })
  },
  setRolePerm: async (role, feature, allowed) => {
    const acl = get().acl
    const next = {
      ...acl,
      rolePerms: { ...acl.rolePerms, [role]: { ...acl.rolePerms[role], [feature]: allowed } },
    }
    await get().save(next)
  },
}))

/** 当前角色是否允许某功能（超管始终允许） */
export function can(role: Role | undefined, feature: string): boolean {
  if (!role) return false
  if (role === 'superadmin') return true
  const perms = useAclStore.getState().acl.rolePerms[role]
  return perms ? perms[feature] !== false : true
}

const MS_HOUR = 3600_000
const MS_DAY = 86400_000

/** 计算用户使用期限剩余毫秒（permanent 返回 Infinity；未设视为 permanent） */
export function remainingMs(username: string): number {
  const acl = useAclStore.getState().acl
  const limit = acl.userLimits[username]
  if (!limit || limit.mode === 'permanent') return Infinity
  const start = acl.firstLoginAt[username]
  if (!start) return Infinity // 还没开始计时
  const span = limit.mode === 'hours' ? (limit.value ?? 0) * MS_HOUR : (limit.value ?? 0) * MS_DAY
  return start ? Date.parse(start) + span - Date.now() : Infinity
}

/**
 * 登录时的使用控制校验：
 * - 被禁用 → 抛错
 * - 超期 → 抛错
 * - 首次登录 → 记录计时起点
 * 超管不受限。
 */
export async function checkAndStampLogin(username: string, role: Role): Promise<void> {
  await useAclStore.getState().load()
  const store = useAclStore.getState()
  const acl = store.acl
  if (acl.disabled[username]) {
    throw new Error('该账号已被超级管理员禁用')
  }
  if (role === 'superadmin') return

  const limit = acl.userLimits[username]
  if (limit && limit.mode !== 'permanent') {
    // 首次登录记录计时起点
    if (!acl.firstLoginAt[username]) {
      await store.save({ ...acl, firstLoginAt: { ...acl.firstLoginAt, [username]: new Date().toISOString() } })
    } else {
      const span = limit.mode === 'hours' ? (limit.value ?? 0) * MS_HOUR : (limit.value ?? 0) * MS_DAY
      if (Date.parse(acl.firstLoginAt[username]) + span < Date.now()) {
        const unit = limit.mode === 'hours' ? '小时' : '天'
        throw new Error(`使用期限已到（${limit.value}${unit}），请联系超级管理员`)
      }
    }
  }
}
