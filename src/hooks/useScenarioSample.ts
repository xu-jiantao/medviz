import { useEffect, useRef } from 'react'
import { useNavStore } from '@/store/navStore'
import type { ViewKey } from '@/nav'

/**
 * 页面根据左侧导航当前场景加载对应示例。
 * apply 会在「当前视图等于本页视图」且 sample 变化时调用。
 */
export function useScenarioSample(view: ViewKey, apply: (sample: string) => void) {
  const navView = useNavStore((s) => s.view)
  const sample = useNavStore((s) => s.sample)
  const applyRef = useRef(apply)
  applyRef.current = apply
  useEffect(() => {
    if (navView === view) applyRef.current(sample)
  }, [view, navView, sample])
}
