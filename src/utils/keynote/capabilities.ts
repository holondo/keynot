import type { PPTElement } from '@/types/slides'

/** Features retained in the bridge until a native writer exists for them. */
export const nativeExtensionState = (element: PPTElement): Record<string, string> => {
  const state: Record<string, string> = {}
  const set = (feature: string, value: object) => {
    const encoded = JSON.stringify(value)
    if (encoded !== '{}') state[feature] = encoded
  }
  if (element.type === 'text') {
    set('Text layout', {
      lineHeight: element.lineHeight, wordSpace: element.wordSpace, paragraphSpace: element.paragraphSpace,
      vertical: element.vertical, inset: element.inset, fixedHeight: element.fixedHeight, vAlign: element.vAlign,
    })
  }
  if (element.type === 'image') set('Image crop and adjustments', { clip: element.clip, filters: element.filters, colorMask: element.colorMask, radius: element.radius })
  if (element.type === 'shape') set('Shape text layout and image fill', { align: element.text?.align, pattern: element.pattern })
  if (element.type === 'chart') set('Chart styling', { fill: element.fill, themeColors: element.themeColors, textColor: element.textColor, lineColor: element.lineColor, outline: element.outline, smooth: element.options?.lineSmooth })
  if (element.type === 'table') {
    set('Table layout and formatting', {
      widths: element.colWidths, heights: element.rowHeights, minHeight: element.cellMinHeight, outline: element.outline,
      theme: element.theme, title: element.title, caption: element.caption, headers: [element.headerRows, element.headerColumns, element.footerRows],
      cells: element.data.map(row => row.map(cell => ({ style: cell.style, colspan: cell.colspan, rowspan: cell.rowspan, dataFormat: cell.dataFormat }))),
    })
  }
  if (element.link?.type === 'slide') set('Slide hyperlink', element.link)
  return state
}
