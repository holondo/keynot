export const ClipPathTypes = {
  RECT: 'rect',
  ELLIPSE: 'ellipse',
  POLYGON: 'polygon',
} as const
export type ClipPathTypes = typeof ClipPathTypes[keyof typeof ClipPathTypes]

export const ClipPaths = {
  RECT: 'rect',
  ROUNDRECT: 'roundRect',
  ELLIPSE: 'ellipse',
  TRIANGLE: 'triangle',
  PENTAGON: 'pentagon',
  RHOMBUS: 'rhombus',
  STAR: 'star',
} as const
export type ClipPaths = typeof ClipPaths[keyof typeof ClipPaths]

interface ClipPath {
  [key: string]: {
    name: string
    type: ClipPathTypes
    style: string
    radius?: string
    createPath?: (width: number, height: number) => string
  }
}

export const CLIPPATHS: ClipPath = {
  rect: {
    name: 'Rectangle',
    type: ClipPathTypes.RECT,
    radius: '0',
    style: '',
  },
  snip1Rect: {
    name: 'Snipped Corner',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(0% 0%, 80% 0%, 100% 20%, 100% 100%, 0 100%)',
    createPath: (width: number, height: number) => {
      return `M 0 0 L ${width * 0.8} 0 L ${width} ${height * 0.2} L ${width} ${height} L 0 ${height} Z`
    },
  },
  snip2DiagRect: {
    name: 'Snipped Diagonal',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(0% 0%, 80% 0%, 100% 20%, 100% 100%, 20% 100%, 0% 80%)',
    createPath: (width: number, height: number) => {
      return `M 0 0 L ${width * 0.8} 0 L ${width} ${height * 0.2} L ${width} ${height} L ${width * 0.2} ${height} L 0 ${height * 0.8} Z`
    },
  },
  roundRect: {
    name: 'Rounded Rectangle',
    type: ClipPathTypes.RECT,
    radius: '10px',
    style: 'inset(0 round 10px)',
  },
  ellipse: {
    name: 'Ellipse',
    type: ClipPathTypes.ELLIPSE,
    style: 'ellipse(50% 50% at 50% 50%)',
  },
  triangle: {
    name: 'Triangle',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(50% 0%, 0% 100%, 100% 100%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.5} 0 L 0 ${height} L ${width} ${height} Z`
    },
  },
  rtTriangle: {
    name: 'Right Triangle',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(0% 0%, 0% 100%, 100% 100%)',
    createPath: (width: number, height: number) => {
      return `M 0 0 L 0 ${height} L ${width} ${height} Z`
    },
  },
  triangleReverse: {
    name: 'Inverted Triangle',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(50% 100%, 0% 0%, 100% 0%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.5} ${height} L 0 0 L ${width} 0 Z`
    },
  },
  diamond: {
    name: 'Diamond',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.5} 0 L ${width} ${height * 0.5} L ${width * 0.5} ${height} L 0 ${height * 0.5} Z`
    },
  },
  rhombus: {
    name: 'Diamond',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.5} 0 L ${width} ${height * 0.5} L ${width * 0.5} ${height} L 0 ${height * 0.5} Z`
    },
  },
  star: {
    name: 'Star',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.5} 0 L ${width * 0.61} ${height * 0.35} L ${width * 0.98} ${height * 0.35} L ${width * 0.68} ${height * 0.57} L ${width * 0.79} ${height * 0.91} L ${width * 0.5} ${height * 0.7} L ${width * 0.21} ${height * 0.91} L ${width * 0.32} ${height * 0.57} L ${width * 0.02} ${height * 0.35} L ${width * 0.39} ${height * 0.35} Z`
    },
  },
  heart: {
    name: 'Heart',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(50% 80%, 20% 52%, 0% 32%, 0% 18%, 14% 0%, 36% 0%, 50% 20%, 64% 0%, 86% 0%, 100% 18%, 100% 32%, 80% 52%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.5} ${height * 0.8} L ${width * 0.2} ${height * 0.52} L 0 ${height * 0.32} L 0 ${height * 0.18} L ${width * 0.14} 0 L ${width * 0.36} 0 L ${width * 0.5} ${height * 0.2} L ${width * 0.64} 0 L ${width * 0.86} 0 L ${width} ${height * 0.18} L ${width} ${height * 0.32} L ${width * 0.8} ${height * 0.52} Z`
    },
  },
  pentagon: {
    name: 'Pentagon',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.5} 0 L ${width} ${0.38 * height} L ${0.82 * width} ${height} L ${0.18 * width} ${height} L 0 ${0.38 * height} Z`
    },
  },
  hexagon: {
    name: 'Hexagon',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.2} 0 L ${width * 0.8} 0 L ${width} ${height * 0.5} L ${width * 0.8} ${height} L ${width * 0.2} ${height} L 0 ${height * 0.5} Z`
    },
  },
  heptagon: {
    name: 'Heptagon',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.5} 0 L ${width * 0.9} ${height * 0.2} L ${width} ${height * 0.6} L ${width * 0.75} ${height} L ${width * 0.25} ${height} L 0 ${height * 0.6} L ${width * 0.1} ${height * 0.2} Z`
    },
  },
  octagon: {
    name: 'Octagon',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.3} 0 L ${width * 0.7} 0 L ${width} ${height * 0.3} L ${width} ${height * 0.7} L ${width * 0.7} ${height} L ${width * 0.3} ${height} L 0 ${height * 0.7} L 0 ${height * 0.3} Z`
    },
  },
  chevron: {
    name: 'Chevron',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%, 0% 0%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.75} 0 L ${width} ${height * 0.5} L ${width * 0.75} ${height} L 0 ${height} L ${width * 0.25} ${height * 0.5} L 0 0 Z`
    },
  },
  homePlate: {
    name: 'Tag',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%)',
    createPath: (width: number, height: number) => {
      return `M 0 0 L ${width * 0.75} 0 L ${width} ${height * 0.5} L ${width * 0.75} ${height} L 0 ${height} Z`
    },
  },
  rightArrow: {
    name: 'Arrow',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)',
    createPath: (width: number, height: number) => {
      return `M 0 ${height * 0.2} L ${width * 0.6} ${height * 0.2} L ${width * 0.6} 0 L ${width} ${height * 0.5} L ${width * 0.6} ${height} L ${width * 0.6} ${height * 0.8} L 0 ${height * 0.8} Z`
    },
  },
  parallelogram: {
    name: 'Parallelogram',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(30% 0%, 100% 0%, 70% 100%, 0% 100%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.3} 0 L ${width} 0 L ${width * 0.7} ${height} L 0 ${height} Z`
    },
  },
  parallelogramReverse: {
    name: 'Reverse Parallelogram',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(30% 100%, 100% 100%, 70% 0%, 0% 0%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.3} ${height} L ${width} ${height} L ${width * 0.7} 0 L 0 0 Z`
    },
  },
  trapezoid: {
    name: 'Trapezoid',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)',
    createPath: (width: number, height: number) => {
      return `M ${width * 0.25} 0 L ${width * 0.75} 0 L ${width} ${height} L 0 ${height} Z`
    },
  },
  trapezoidReverse: {
    name: 'Inverted Trapezoid',
    type: ClipPathTypes.POLYGON,
    style: 'polygon(0% 0%, 100% 0%, 75% 100%, 25% 100%)',
    createPath: (width: number, height: number) => {
      return `M 0 0 L ${width} 0 L ${width * 0.75} ${height} L ${width * 0.25} ${height} Z`
    },
  },
}

/**
 * Safe accessor for image clip paths with automatic fallback to rect
 */
export function getClipPath(key?: string) {
  if (!key) return CLIPPATHS.rect
  return CLIPPATHS[key] || CLIPPATHS.rect
}