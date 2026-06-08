import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * 把一个 DOM 元素（图表卡片）导出为 PDF。
 * 注意：图表内的中文随截图一起栅格化，因此可正常显示；
 * 页眉元信息用 ASCII，避免 jsPDF 内置字体不含中文。
 */
export async function exportElementToPdf(el: HTMLElement, opts?: { fileName?: string }) {
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
  const img = canvas.toDataURL('image/png')

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 36

  // 页眉（ASCII）
  const date = new Date().toISOString().slice(0, 10)
  pdf.setFontSize(13)
  pdf.text('MedViz Report', margin, 30)
  pdf.setFontSize(9)
  pdf.setTextColor(120)
  pdf.text(date, pageW - margin, 30, { align: 'right' })
  pdf.setDrawColor(220)
  pdf.line(margin, 40, pageW - margin, 40)
  pdf.setTextColor(0)

  // 图片等比缩放，限制在页面内
  const maxW = pageW - margin * 2
  const maxH = pageH - 60 - margin
  let w = maxW
  let h = (canvas.height * w) / canvas.width
  if (h > maxH) {
    h = maxH
    w = (canvas.width * h) / canvas.height
  }
  pdf.addImage(img, 'PNG', (pageW - w) / 2, 52, w, h)

  pdf.save(opts?.fileName ?? `medviz-报告-${date}.pdf`)
}
