import { create } from 'zustand'

export interface Patient {
  name: string
  gender: string
  age: number
  bed: string
  mrn: string // 住院号
  diagnosis: string
}

interface PatientState {
  patient: Patient
  setPatient: (p: Partial<Patient>) => void
}

// 演示用默认患者
const DEFAULT: Patient = {
  name: '王秀英',
  gender: '女',
  age: 68,
  bed: '心内科 12-3',
  mrn: 'MRN 0098231',
  diagnosis: '高血压3级（极高危）',
}

export const usePatientStore = create<PatientState>((set) => ({
  patient: DEFAULT,
  setPatient: (p) => set((s) => ({ patient: { ...s.patient, ...p } })),
}))
