import { computed, ref } from 'vue'
import type { SupportedLocale, I18nTranslations } from './types'
import { enUS } from './locales/en-US.ts'
import { ptBR } from './locales/pt-BR.ts'

export const LOCALSTORAGE_KEY_LOCALE = 'keynot_locale'
export const COOKIE_KEY_LOCALE = 'keynot_locale'

const dictionaries: Record<SupportedLocale, I18nTranslations> = {
  'en-US': enUS,
  'pt-BR': ptBR,
}

export const AVAILABLE_LOCALES: Array<{ code: SupportedLocale; name: string; flag: string }> = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
]

// Normalize input string (e.g. 'pt', 'pt-BR', 'pt_BR', 'en', 'en-US') to SupportedLocale
export function normalizeLocale(val: string | null | undefined): SupportedLocale | null {
  if (!val) return null
  const cleaned = val.trim().toLowerCase().replace('_', '-')
  if (cleaned.startsWith('pt')) return 'pt-BR'
  if (cleaned.startsWith('en')) return 'en-US'
  return null
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return
  const maxAge = days * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax`
}

function getUrlParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get(name) || params.get('lang') || params.get('locale')
  }
  catch {
    return null
  }
}

/**
 * Detect locale in strict priority order:
 * 1. URL parameter (?lang= or ?locale=)
 * 2. Cookie (keynot_locale)
 * 3. LocalStorage (keynot_locale)
 * 4. Default: 'en-US' (English First!)
 */
export function detectLocale(): SupportedLocale {
  // 1. URL parameter
  const urlParam = getUrlParam('locale')
  const normalizedFromUrl = normalizeLocale(urlParam)
  if (normalizedFromUrl) return normalizedFromUrl

  // 2. Cookie
  const cookieVal = getCookie(COOKIE_KEY_LOCALE)
  const normalizedFromCookie = normalizeLocale(cookieVal)
  if (normalizedFromCookie) return normalizedFromCookie

  // 3. LocalStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCALSTORAGE_KEY_LOCALE)
      const normalizedFromStorage = normalizeLocale(stored)
      if (normalizedFromStorage) return normalizedFromStorage
    }
    catch {
      // Ignore storage access errors
    }
  }

  // 4. Default fallback: English First
  return 'en-US'
}

export const currentLocale = ref<SupportedLocale>(detectLocale())

export function setLocale(locale: SupportedLocale) {
  currentLocale.value = locale

  // Persist to LocalStorage
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY_LOCALE, locale)
    }
    catch {
      // Ignore
    }
  }

  // Persist to Cookie
  setCookie(COOKIE_KEY_LOCALE, locale)

  // Update HTML lang attribute
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

// Map command IDs directly to translation dictionary path
const commandIdToI18nKeyMap: Record<string, string> = {
  // File
  'file.new': 'menu.fileNew',
  'file.open': 'menu.fileOpen',
  'file.workspace': 'menu.fileWorkspace',
  'file.theme': 'menu.fileTheme',
  'file.versions': 'menu.fileVersions',
  'file.export': 'menu.fileExport',
  'file.export.keynote': 'menu.fileExportKeynote',
  'file.export.powerpoint': 'menu.fileExportPowerpoint',
  'file.export.pdf': 'menu.fileExportPdf',
  'file.export.images': 'menu.fileExportImages',
  'file.compatibility': 'menu.fileCompatibility',

  // Edit
  'edit.undo': 'menu.editUndo',
  'edit.redo': 'menu.editRedo',
  'edit.cut': 'menu.editCut',
  'edit.copy': 'menu.editCopy',
  'edit.paste': 'menu.editPaste',
  'edit.duplicate': 'menu.editDuplicate',
  'edit.delete': 'menu.editDelete',
  'edit.select-all': 'menu.editSelectAll',
  'edit.find': 'menu.editFind',

  // Insert
  'insert.slide': 'menu.insertSlide',
  'insert.text': 'menu.insertText',
  'insert.shape': 'menu.insertShape',
  'insert.shape.rectangle': 'menu.insertShapeRectangle',
  'insert.shape.circle': 'menu.insertShapeCircle',
  'insert.shape.line': 'menu.insertShapeLine',
  'insert.table': 'menu.insertTable',
  'insert.chart': 'menu.insertChart',
  'insert.media': 'menu.insertMedia',
  'insert.media.image': 'menu.insertMediaImage',
  'insert.media.video': 'menu.insertMediaVideo',
  'insert.media.audio': 'menu.insertMediaAudio',
  'insert.latex': 'menu.insertLatex',
  'insert.comment': 'menu.insertComment',

  // Slide
  'slide.add': 'menu.slideAdd',
  'slide.duplicate': 'menu.slideDuplicate',
  'slide.delete': 'menu.slideDelete',
  'slide.skip': 'menu.slideSkip',
  'slide.layout': 'menu.slideLayout',
  'slide.background': 'menu.slideBackground',
  'slide.notes': 'menu.slideNotes',

  // Format
  'format.inspector': 'menu.formatInspector',
  'format.animate': 'menu.formatAnimate',
  'format.document': 'menu.formatDocument',
  'format.copy-style': 'menu.formatCopyStyle',
  'format.paste-style': 'menu.formatPasteStyle',
  'format.font': 'menu.formatFont',
  'format.font.bold': 'menu.formatFontBold',
  'format.font.italic': 'menu.formatFontItalic',
  'format.font.underline': 'menu.formatFontUnderline',

  // Arrange
  'arrange.front': 'menu.arrangeFront',
  'arrange.forward': 'menu.arrangeForward',
  'arrange.backward': 'menu.arrangeBackward',
  'arrange.back': 'menu.arrangeBack',
  'arrange.align': 'menu.arrangeAlign',
  'arrange.align.left': 'menu.arrangeAlignLeft',
  'arrange.align.center': 'menu.arrangeAlignCenter',
  'arrange.align.right': 'menu.arrangeAlignRight',
  'arrange.group': 'menu.arrangeGroup',
  'arrange.ungroup': 'menu.arrangeUngroup',
  'arrange.lock': 'menu.arrangeLock',

  // View
  'view.navigator': 'menu.viewNavigator',
  'view.slide-only': 'menu.viewSlideOnly',
  'view.light-table': 'menu.viewLightTable',
  'view.rulers': 'menu.viewRulers',
  'view.object-list': 'menu.viewObjectList',
  'view.comments': 'menu.viewComments',
  'view.dark-mode': 'menu.viewDarkMode',

  // Play
  'play.beginning': 'menu.playBeginning',
  'play.current': 'menu.playCurrent',
  'play.rehearse': 'menu.playRehearse',

  // Help
  'help.shortcuts': 'menu.helpShortcuts',
  'help.keynote': 'menu.helpKeynote',
  'help.about': 'menu.helpAbout',
}

const menuIdToI18nKeyMap: Record<string, string> = {
  file: 'menu.file',
  edit: 'menu.edit',
  insert: 'menu.insert',
  slide: 'menu.slide',
  format: 'menu.format',
  arrange: 'menu.arrange',
  view: 'menu.view',
  play: 'menu.play',
  help: 'menu.help',
}

/**
 * Universal translation function.
 * Resolves dot-separated keys, e.g. `t('header.saving')` or command IDs `t('file.new')`.
 */
export function t(key: string, fallback?: string, params?: Record<string, string | number>): string {
  const locale = currentLocale.value
  const dict = dictionaries[locale] || dictionaries['en-US']

  // Check if key is a command ID directly
  const mappedKey = commandIdToI18nKeyMap[key] || menuIdToI18nKeyMap[key] || key

  const parts = mappedKey.split('.')
  let current: any = dict

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    }
    else {
      current = undefined
      break
    }
  }

  // Fallback to English if missing in target locale
  if (current === undefined && locale !== 'en-US') {
    let fallbackCurrent: any = dictionaries['en-US']
    for (const part of parts) {
      if (fallbackCurrent && typeof fallbackCurrent === 'object' && part in fallbackCurrent) {
        fallbackCurrent = fallbackCurrent[part]
      }
      else {
        fallbackCurrent = undefined
        break
      }
    }
    if (fallbackCurrent !== undefined && typeof fallbackCurrent === 'string') {
      current = fallbackCurrent
    }
  }

  let result = typeof current === 'string' ? current : (fallback ?? key)

  // Param interpolation: {name} -> value
  if (params && typeof result === 'string') {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }

  return result
}

export function useI18n() {
  const locale = computed(() => currentLocale.value)
  return {
    locale,
    currentLocale,
    availableLocales: AVAILABLE_LOCALES,
    setLocale,
    t,
  }
}

export type { SupportedLocale, I18nTranslations } from './types'
