import type { EChartsOption } from 'echarts'

// 表格图标（Ant Design TableOutlined 的路径），用于工具栏「导出Excel」按钮
const EXCEL_ICON =
  'path://M928 160H96c-17.7 0-32 14.3-32 32v640c0 17.7 14.3 32 32 32h832c17.7 0 32-14.3 32-32V192c0-17.7-14.3-32-32-32zm-40 208H368V232h520v136zm-552 0H136V232h200v136zM136 440h200v152H136V440zm232 0h520v152H368V440zM136 664h200v128H136V664zm232 0h520v128H368V664z'

/** 给已生成的 ECharts option 注入一个「导出Excel」工具栏按钮（紧挨导出PNG） */
export function withExcelToolbox(option: EChartsOption, onClick?: () => void): EChartsOption {
  if (!onClick) return option
  const toolbox = { ...((option.toolbox as Record<string, unknown>) ?? {}) }
  const feature = { ...((toolbox.feature as Record<string, unknown>) ?? {}) }
  feature.myExcel = {
    show: true,
    title: '导出Excel',
    icon: EXCEL_ICON,
    onclick: onClick,
  }
  toolbox.feature = feature
  return { ...option, toolbox }
}
