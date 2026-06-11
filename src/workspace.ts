import { idbGet, idbSet } from './auth/idb'
import { useTrendStore } from './store/trendStore'
import { useRadarStore } from './store/radarStore'
import { useHeatmapStore } from './store/heatmapStore'
import { useNomogramStore } from './store/nomogramStore'
import { usePatientStore, DEFAULT_PATIENT } from './store/patientStore'
import { useClinicalStore } from './store/clinicalStore'
import { useNavStore } from './store/navStore'
import { DEFAULT_SCENARIO } from './nav'
import { trendSamples } from './charts/TrendChart/samples'
import { radarSamples } from './charts/RadarChart/samples'
import { heatmapSamples } from './charts/Heatmap/samples'
import { nomogramSamples } from './charts/Nomogram/samples'
import { useCloudStore } from './auth/cloudStore'
import { cloudGetWorkspace, cloudPutWorkspace } from './auth/cloudClient'

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

interface WorkspaceData {
  trend: unknown
  radar: unknown
  heatmap: unknown
  nomogram: unknown
  nomogramSelection: unknown
  patient: unknown
  clinicalOverrides: unknown
  scenarioKey: string
  savedAt: string
}

const key = (username: string) => `workspace:${username.toLowerCase()}`

/** 采集当前所有可视化与上下文状态 */
export function gatherWorkspace(): WorkspaceData {
  return {
    trend: useTrendStore.getState().config,
    radar: useRadarStore.getState().config,
    heatmap: useHeatmapStore.getState().config,
    nomogram: useNomogramStore.getState().config,
    nomogramSelection: useNomogramStore.getState().selection,
    patient: usePatientStore.getState().patient,
    clinicalOverrides: useClinicalStore.getState().overrides,
    scenarioKey: useNavStore.getState().scenarioKey,
    savedAt: new Date().toISOString(),
  }
}

/** 把一份工作区数据应用到各 store */
function applyWorkspace(w: WorkspaceData) {
  if (w.trend) useTrendStore.getState().setConfig(w.trend as never)
  if (w.radar) useRadarStore.getState().setConfig(w.radar as never)
  if (w.heatmap) useHeatmapStore.getState().setConfig(w.heatmap as never)
  if (w.nomogram) useNomogramStore.getState().setConfig(w.nomogram as never)
  if (w.nomogramSelection) useNomogramStore.setState({ selection: w.nomogramSelection as never })
  if (w.patient) usePatientStore.getState().setPatient(w.patient as never)
  if (w.clinicalOverrides) useClinicalStore.getState().setOverrides(w.clinicalOverrides as never)
  if (w.scenarioKey) useNavStore.getState().restore(w.scenarioKey)
}

/** 登录/刷新后恢复该用户的本地工作区（不触发示例重载） */
export async function loadWorkspace(username: string): Promise<boolean> {
  const w = await idbGet<WorkspaceData>(key(username))
  if (!w) return false
  applyWorkspace(w)
  return true
}

/** 立即把当前工作区推送到云端（需已登录云账号）。返回是否推送。 */
export async function pushWorkspaceToCloud(): Promise<boolean> {
  const { backendUrl, token } = useCloudStore.getState()
  if (!token) return false
  await cloudPutWorkspace(backendUrl, token, gatherWorkspace() as never)
  return true
}

/**
 * 与云端工作区双向合并（以 savedAt 较新者为准）：
 * - 云端更新 → 拉下来应用并写本地
 * - 本地更新 → 推到云端
 * 用于登录云账号后、换设备/重装恢复。返回 'pulled' | 'pushed' | 'none'。
 */
export async function syncWorkspaceFromCloud(localUsername: string): Promise<'pulled' | 'pushed' | 'none'> {
  const { backendUrl, token } = useCloudStore.getState()
  if (!token) return 'none'
  const remote = (await cloudGetWorkspace(backendUrl, token)).workspace as WorkspaceData | null
  const local = await idbGet<WorkspaceData>(key(localUsername))
  const rt = remote?.savedAt ? Date.parse(remote.savedAt) : 0
  const lt = local?.savedAt ? Date.parse(local.savedAt) : 0
  if (remote && rt >= lt) {
    applyWorkspace(remote)
    await idbSet(key(localUsername), remote) // 同步进本地缓存
    return 'pulled'
  }
  if (local) {
    await cloudPutWorkspace(backendUrl, token, local as never)
    return 'pushed'
  }
  return 'none'
}

/** 重置为初始默认（切换到无工作区的用户时用，避免上一个用户数据残留） */
export function resetWorkspace() {
  useTrendStore.getState().setConfig(clone(trendSamples['高血压3年血压趋势']))
  useRadarStore.getState().setConfig(clone(radarSamples['SOFA器官功能评分']))
  useHeatmapStore.getState().setConfig(clone(heatmapSamples['基因突变(分类色块)']))
  useNomogramStore.getState().setConfig(clone(nomogramSamples['非小细胞肺癌术后生存']))
  useNomogramStore.setState({ selection: {} })
  useClinicalStore.getState().setOverrides({})
  usePatientStore.getState().setPatient(clone(DEFAULT_PATIENT))
  useNavStore.getState().restore(DEFAULT_SCENARIO)
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let cloudTimer: ReturnType<typeof setTimeout> | null = null

/** 开启自动保存：任一相关 store 变化即防抖写本地，并（已登录云账号时）推送云端。返回取消函数。 */
export function startAutosave(username: string): () => void {
  const trigger = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      idbSet(key(username), gatherWorkspace()).catch(() => {})
    }, 600)
    // 云端推送：更长防抖，失败静默（避免 Render 冷启动卡顿）
    if (useCloudStore.getState().token) {
      if (cloudTimer) clearTimeout(cloudTimer)
      cloudTimer = setTimeout(() => { pushWorkspaceToCloud().catch(() => {}) }, 3000)
    }
  }
  const unsubs = [
    useTrendStore.subscribe(trigger),
    useRadarStore.subscribe(trigger),
    useHeatmapStore.subscribe(trigger),
    useNomogramStore.subscribe(trigger),
    usePatientStore.subscribe(trigger),
    useClinicalStore.subscribe(trigger),
    useNavStore.subscribe(trigger),
  ]
  return () => {
    unsubs.forEach((u) => u())
    if (saveTimer) clearTimeout(saveTimer)
    if (cloudTimer) clearTimeout(cloudTimer)
  }
}
