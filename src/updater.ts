import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

/** 是否运行在 Tauri 桌面端（网页里为 false，更新功能跳过） */
export const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export interface UpdateInfo {
  version: string
  notes?: string
  /** 下载、安装并重启应用 */
  install: () => Promise<void>
}

/** 检查更新；有新版本返回信息，否则返回 null（网页端始终 null） */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri) return null
  const update = await check()
  if (!update) return null
  return {
    version: update.version,
    notes: update.body,
    install: async () => {
      await update.downloadAndInstall()
      await relaunch()
    },
  }
}
