export interface FontItem {
  label: string
  value: string
  category?: string
}

export const FONTS: FontItem[] = [
  // Apple Keynote & System Fonts
  { label: 'SF Pro (Apple System)', value: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif', category: 'Apple / System' },
  { label: 'Helvetica Neue', value: '"Helvetica Neue", Helvetica, Arial, sans-serif', category: 'Apple / System' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif', category: 'Apple / System' },
  { label: 'Avenir Next', value: '"Avenir Next", Avenir, sans-serif', category: 'Apple / System' },
  { label: 'Futura', value: 'Futura, "Trebuchet MS", sans-serif', category: 'Apple / System' },
  { label: 'Gill Sans', value: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif', category: 'Apple / System' },
  { label: 'Optima', value: 'Optima, Candara, sans-serif', category: 'Apple / System' },

  // Serif / Editorial
  { label: 'Baskerville', value: 'Baskerville, "Baskerville Old Face", serif', category: 'Serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif', category: 'Serif' },
  { label: 'Palatino', value: 'Palatino, "Palatino Linotype", serif', category: 'Serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif', category: 'Serif' },
  { label: 'Source Serif 4', value: 'SourceSerif4, Georgia, serif', category: 'Serif' },
  { label: 'Merriweather', value: 'Merriweather, serif', category: 'Serif' },
  { label: 'Literata', value: 'Literata, serif', category: 'Serif' },

  // Modern Sans
  { label: 'Inter', value: 'Inter, sans-serif', category: 'Sans' },
  { label: 'Roboto', value: 'Roboto, sans-serif', category: 'Sans' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif', category: 'Sans' },
  { label: 'Open Sans', value: 'OpenSans, sans-serif', category: 'Sans' },
  { label: 'Lato', value: 'Lato, sans-serif', category: 'Sans' },
  { label: 'Source Sans Pro', value: 'SourceSansPro, sans-serif', category: 'Sans' },
  { label: 'Arial', value: 'Arial, sans-serif', category: 'Sans' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif', category: 'Sans' },

  // Monospace
  { label: 'SF Mono', value: '"SF Mono", Menlo, Consolas, Monaco, monospace', category: 'Monospace' },
  { label: 'JetBrains Mono', value: 'JetBrainsMono, monospace', category: 'Monospace' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace', category: 'Monospace' },

  // CJK / Other
  { label: 'MiSans', value: 'MiSans, sans-serif', category: 'CJK' },
  { label: 'Source Han Sans', value: 'SourceHanSans, sans-serif', category: 'CJK' },
  { label: 'Source Han Serif', value: 'SourceHanSerif, serif', category: 'CJK' },
  { label: 'LXGW WenKai', value: 'LXGWWenKai, serif', category: 'CJK' },
  { label: 'Alibaba PuHuiTi', value: 'AlibabaPuHuiTi, sans-serif', category: 'CJK' },
]