import type { CellDataFormat, TableCell } from '@/types/slides'

export const parseRawCellValue = (val: string | number | boolean | null | undefined): string | number => {
  if (val === null || val === undefined) return ''
  if (typeof val === 'number') return val
  const str = String(val).trim()
  if (!str) return ''
  if (str.endsWith('%')) {
    const num = parseFloat(str.slice(0, -1).replace(/,/g, ''))
    if (!isNaN(num)) return num / 100
  }
  if (/^[$€£¥-]/.test(str)) {
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''))
    if (!isNaN(num)) return num
  }
  const stripped = str.replace(/,/g, '')
  if (/^-?\d+(\.\d+)?$/.test(stripped)) {
    const cleanNum = parseFloat(stripped)
    if (!isNaN(cleanNum)) return cleanNum
  }
  return str
}

export const formatCellValue = (cell: TableCell): string => {
  if (!cell.dataFormat || cell.dataFormat.kind === 'automatic') {
    if (cell.rawValue !== undefined && cell.rawValue !== null) {
      return String(cell.rawValue)
    }
    return cell.text
  }

  const raw = cell.rawValue !== undefined && cell.rawValue !== null ? cell.rawValue : cell.text
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, ''))
  const isNum = !isNaN(num)

  switch (cell.dataFormat.kind) {
    case 'number': {
      if (!isNum) return String(raw)
      const decimals = cell.dataFormat.decimals !== undefined ? cell.dataFormat.decimals : 2
      const useGrouping = cell.dataFormat.thousandsSeparator !== false
      const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      }).format(Math.abs(num))
      if (num < 0) {
        if (cell.dataFormat.negativeStyle === 'parentheses') return `(${formatted})`
        return `-${formatted}`
      }
      return formatted
    }

    case 'currency': {
      if (!isNum) return String(raw)
      const decimals = cell.dataFormat.decimals !== undefined ? cell.dataFormat.decimals : 2
      const currency = cell.dataFormat.currencyCode || 'USD'
      const isParen = cell.dataFormat.negativeStyle === 'parentheses'
      let formatted = ''
      try {
        formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(isParen ? Math.abs(num) : num)
      }
      catch {
        formatted = `$${(isParen ? Math.abs(num) : num).toFixed(decimals)}`
      }
      if (num < 0 && isParen) return `(${formatted})`
      return formatted
    }

    case 'percentage': {
      if (!isNum) return String(raw)
      const decimals = cell.dataFormat.decimals !== undefined ? cell.dataFormat.decimals : 0
      const pctValue = String(raw).indexOf('%') === -1 ? num * 100 : num
      return `${pctValue.toFixed(decimals)}%`
    }

    case 'fraction': {
      if (!isNum) return String(raw)
      const whole = Math.floor(num)
      const remainder = Math.abs(num - whole)
      if (remainder < 0.05) return String(whole)
      // common fractions: 1/4, 1/3, 1/2, 2/3, 3/4
      if (Math.abs(remainder - 0.25) < 0.05) return whole ? `${whole} 1/4` : '1/4'
      if (Math.abs(remainder - 0.33) < 0.05) return whole ? `${whole} 1/3` : '1/3'
      if (Math.abs(remainder - 0.5) < 0.05) return whole ? `${whole} 1/2` : '1/2'
      if (Math.abs(remainder - 0.67) < 0.05) return whole ? `${whole} 2/3` : '2/3'
      if (Math.abs(remainder - 0.75) < 0.05) return whole ? `${whole} 3/4` : '3/4'
      return num.toFixed(2)
    }

    case 'scientific': {
      if (!isNum) return String(raw)
      const decimals = cell.dataFormat.decimals !== undefined ? cell.dataFormat.decimals : 2
      return num.toExponential(decimals).toUpperCase().replace(/E\+0+(\d+)/, 'E+$1').replace(/E\-0+(\d+)/, 'E-$1')
    }

    case 'text':
      return String(raw)

    case 'dateTime': {
      const date = new Date(String(raw))
      if (isNaN(date.getTime())) return String(raw)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }

    default:
      return String(raw)
  }
}

export const formatTableCellValue = (val: string | number | boolean | null | undefined, format?: CellDataFormat): string => {
  return formatCellValue({
    id: 'test-cell',
    colspan: 1,
    rowspan: 1,
    text: val !== undefined && val !== null ? String(val) : '',
    rawValue: val,
    dataFormat: format,
  })
}
