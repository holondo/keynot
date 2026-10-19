export type InspectorMode = 'format' | 'animate' | 'document'

export const enum ToolbarStates {
  // Keynote Format Tabs
  STYLE = 'style',
  TEXT = 'text',
  IMAGE = 'image',
  ARRANGE = 'arrange',
  SLIDE_LAYOUT = 'slideLayout',
  TABLE = 'table',
  CELL = 'cell',
  CHART = 'chart',
  AXIS = 'axis',
  SERIES = 'series',
  MEDIA = 'media',

  // Keynote Animate Tabs
  TRANSITION = 'transition',
  BUILD_IN = 'buildIn',
  ACTION = 'action',
  BUILD_OUT = 'buildOut',

  // Keynote Document Tabs
  DOCUMENT = 'document',
  AUDIO = 'audio',

  // Legacy mappings for backward compatibility
  EL_ANIMATION = 'elAnimation',
  EL_STYLE = 'elStyle',
  EL_POSITION = 'elPosition',
  SLIDE_DESIGN = 'slideDesign',
  SLIDE_ANIMATION = 'slideAnimation',
  MULTI_STYLE = 'multiStyle',
  MULTI_POSITION = 'multiPosition',
}