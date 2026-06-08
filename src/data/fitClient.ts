import type { NomogramConfig } from '@/charts/Nomogram/types'

// 与后端 backend/app.py 的接口对应

export interface PredictorSpec {
  name: string
  type: 'continuous' | 'categorical'
  label?: string
  unit?: string
}

type FitResult = NomogramConfig & { _meta?: Record<string, unknown> }

async function postJson(url: string, body: unknown): Promise<FitResult> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error((detail as { detail?: string }).detail ?? `请求失败 (${res.status})`)
  }
  return res.json()
}

export function fitLogistic(
  baseUrl: string,
  params: {
    data: Record<string, unknown>[]
    outcome: string
    predictors: PredictorSpec[]
    title?: string
    outcomeName?: string
    pointsMax?: number
  },
): Promise<FitResult> {
  return postJson(`${baseUrl.replace(/\/$/, '')}/fit/logistic`, params)
}

export function fitCox(
  baseUrl: string,
  params: {
    data: Record<string, unknown>[]
    duration: string
    event: string
    predictors: PredictorSpec[]
    times: number[]
    timeLabels?: string[]
    title?: string
    pointsMax?: number
  },
): Promise<FitResult> {
  return postJson(`${baseUrl.replace(/\/$/, '')}/fit/cox`, params)
}

export async function checkBackend(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/health`)
    return res.ok
  } catch {
    return false
  }
}
