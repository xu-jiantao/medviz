import { create } from 'zustand'
import { SCENARIOS } from '@/nav'
import { useTrendStore } from './trendStore'
import { useRadarStore } from './radarStore'
import { useHeatmapStore } from './heatmapStore'
import { useNomogramStore } from './nomogramStore'
import { useNavStore } from './navStore'
import { trendSamples } from '@/charts/TrendChart/samples'
import { radarSamples } from '@/charts/RadarChart/samples'
import { heatmapSamples } from '@/charts/Heatmap/samples'
import { nomogramSamples } from '@/charts/Nomogram/samples'

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

export interface Patient {
  name: string
  gender: string
  age: number
  bed: string
  mrn: string // 住院号 (MRN - Unique key)
  diagnosis: string
}

interface PatientState {
  patient: Patient // 当前展示的病人基本信息 (Keep for compatibility)
  patients: Patient[] // 病人列表
  activePatientId: string // 当前激活展示的病人住院号
  patientConfigs: Record<string, Record<string, any>> // 13种图的配置。key 1: mrn, key 2: scenarioKey, value: config
  
  setPatient: (p: Partial<Patient>) => void
  setPatients: (list: Patient[]) => void
  setActivePatientId: (id: string) => void
  setPatientConfigs: (configs: Record<string, Record<string, any>>) => void
  updatePatientConfig: (patientId: string, scenarioKey: string, config: any) => void
  addPatient: (p: Patient) => void
  removePatient: (mrn: string) => void
}

// 演示用默认患者
export const DEFAULT_PATIENT: Patient = {
  name: '王秀英',
  gender: '女',
  age: 68,
  bed: '心内科 12-3',
  mrn: 'MRN-0098231',
  diagnosis: '高血压3级（极高危）',
}

export const usePatientStore = create<PatientState>((set) => ({
  patient: DEFAULT_PATIENT,
  patients: [DEFAULT_PATIENT],
  activePatientId: DEFAULT_PATIENT.mrn,
  patientConfigs: {},
  
  setPatient: (p) => set((s) => {
    const updatedPatient = { ...s.patient, ...p }
    const updatedPatients = s.patients.map(x => x.mrn === s.activePatientId ? { ...x, ...p } : x)
    return {
      patient: updatedPatient,
      patients: updatedPatients,
    }
  }),
  setPatients: (list) => set({ patients: list }),
  setActivePatientId: (id) => set((s) => {
    const hit = s.patients.find(x => x.mrn === id)
    return {
      activePatientId: id,
      patient: hit ?? s.patient,
    }
  }),
  setPatientConfigs: (configs) => set({ patientConfigs: configs }),
  updatePatientConfig: (patientId, scenarioKey, config) => set((s) => {
    const patientMap = s.patientConfigs[patientId] ?? {}
    return {
      patientConfigs: {
        ...s.patientConfigs,
        [patientId]: {
          ...patientMap,
          [scenarioKey]: config
        }
      }
    }
  }),
  addPatient: (p) => set((s) => {
    if (s.patients.some(x => x.mrn === p.mrn)) {
      // If it exists, update it
      const updated = s.patients.map(x => x.mrn === p.mrn ? p : x)
      return { patients: updated }
    }
    return {
      patients: [...s.patients, p]
    }
  }),
  removePatient: (mrn) => set((s) => {
    const filtered = s.patients.filter(x => x.mrn !== mrn)
    const nextActiveId = filtered.length > 0 ? filtered[0].mrn : ''
    const nextPatient = filtered.length > 0 ? filtered[0] : DEFAULT_PATIENT
    const updatedConfigs = { ...s.patientConfigs }
    delete updatedConfigs[mrn]
    return {
      patients: filtered,
      activePatientId: nextActiveId,
      patient: nextPatient,
      patientConfigs: updatedConfigs,
    }
  }),
}))

/** 智能加载某个病人的对应场景图表数据 */
export function loadPatientData(patientId: string, scenarioKey: string) {
  const patientStore = usePatientStore.getState()
  const activeScenario = SCENARIOS[scenarioKey]
  if (!activeScenario) return
  
  let config = patientStore.patientConfigs[patientId]?.[scenarioKey]
  if (!config) {
    const sampleName = activeScenario.sample
    let sampleConfig: any = null
    if (activeScenario.view === 'trend') sampleConfig = trendSamples[sampleName]
    else if (activeScenario.view === 'radar') sampleConfig = radarSamples[sampleName]
    else if (activeScenario.view === 'heatmap') sampleConfig = heatmapSamples[sampleName]
    else if (activeScenario.view === 'nomogram') sampleConfig = nomogramSamples[sampleName]
    
    if (sampleConfig) {
      config = clone(sampleConfig)
    }
  }
  
  if (config) {
    if (activeScenario.view === 'trend') useTrendStore.getState().setConfig(config)
    else if (activeScenario.view === 'radar') useRadarStore.getState().setConfig(config)
    else if (activeScenario.view === 'heatmap') useHeatmapStore.getState().setConfig(config)
    else if (activeScenario.view === 'nomogram') {
      useNomogramStore.getState().setConfig(config)
      if (config._selection) {
        useNomogramStore.setState({ selection: config._selection })
      } else {
        useNomogramStore.setState({ selection: {} })
      }
    }
  }
}

/** 自动将当前活跃图表的状态保存至当前患者名下 */
export function saveActivePatientConfig() {
  const patientStore = usePatientStore.getState()
  const activeId = patientStore.activePatientId
  const scenarioKey = useNavStore.getState().scenarioKey
  const activeScenario = SCENARIOS[scenarioKey]
  if (!activeId || !activeScenario) return
  
  let activeConfig: any = null
  if (activeScenario.view === 'trend') activeConfig = useTrendStore.getState().config
  else if (activeScenario.view === 'radar') activeConfig = useRadarStore.getState().config
  else if (activeScenario.view === 'heatmap') activeConfig = useHeatmapStore.getState().config
  else if (activeScenario.view === 'nomogram') {
    activeConfig = {
      ...useNomogramStore.getState().config,
      _selection: useNomogramStore.getState().selection
    }
  }
  
  if (activeConfig) {
    patientStore.updatePatientConfig(activeId, scenarioKey, clone(activeConfig))
  }
}
