import assert from 'node:assert/strict'
import { enUS } from '../src/i18n/locales/en-US.ts'
import { ptBR } from '../src/i18n/locales/pt-BR.ts'
import {
  t,
  setLocale,
  currentLocale,
  detectLocale,
  normalizeLocale,
  LOCALSTORAGE_KEY_LOCALE,
  COOKIE_KEY_LOCALE,
  AVAILABLE_LOCALES,
} from '../src/i18n/index.ts'
import { KEYNOTE_MENUS, flattenCommands } from '../src/commands/keynoteCommands.ts'

console.log('=== KeyNot i18n & Portuguese Translation Automated Parity Suite ===\n')

// 1. Structural Parity & Completeness Check
console.log('[1/5] Testing 100% dictionary key parity between en-US and pt-BR...')
{
  function extractKeys(obj: Record<string, any>, prefix = ''): Map<string, string> {
    const result = new Map<string, string>()
    for (const [key, val] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key
      if (typeof val === 'object' && val !== null) {
        const sub = extractKeys(val, fullPath)
        for (const [k, v] of sub) {
          result.set(k, v)
        }
      }
      else if (typeof val === 'string') {
        result.set(fullPath, val)
      }
    }
    return result
  }

  const enKeys = extractKeys(enUS)
  const ptKeys = extractKeys(ptBR)

  assert.ok(enKeys.size > 150, `Expected at least 150 translation keys, got ${enKeys.size}`)
  assert.equal(enKeys.size, ptKeys.size, `Key count mismatch: en-US has ${enKeys.size}, pt-BR has ${ptKeys.size}`)

  const missingInPt: string[] = []
  const missingInEn: string[] = []
  const emptyInPt: string[] = []
  const tokenMismatches: string[] = []

  for (const [k, enVal] of enKeys) {
    if (!ptKeys.has(k)) {
      missingInPt.push(k)
    }
    else {
      const ptVal = ptKeys.get(k)!
      if (!ptVal || ptVal.trim() === '') {
        emptyInPt.push(k)
      }

      // Check placeholder tokens (e.g. {current}, {total}, {count})
      const enTokens = (enVal.match(/\{[a-zA-Z0-9_-]+\}/g) || []).sort()
      const ptTokens = (ptVal.match(/\{[a-zA-Z0-9_-]+\}/g) || []).sort()
      if (enTokens.join(',') !== ptTokens.join(',')) {
        tokenMismatches.push(`${k}: en=[${enTokens.join(',')}] pt=[${ptTokens.join(',')}]`)
      }
    }
  }

  for (const [k] of ptKeys) {
    if (!enKeys.has(k)) {
      missingInEn.push(k)
    }
  }

  assert.deepEqual(missingInPt, [], `Keys missing in pt-BR: ${missingInPt.join(', ')}`)
  assert.deepEqual(missingInEn, [], `Keys missing in en-US: ${missingInEn.join(', ')}`)
  assert.deepEqual(emptyInPt, [], `Empty translation values in pt-BR: ${emptyInPt.join(', ')}`)
  assert.deepEqual(tokenMismatches, [], `Token mismatches between locales: ${tokenMismatches.join('; ')}`)

  console.log(`  PASS: All ${enKeys.size} dictionary keys strictly matched with 0 gaps or missing tokens.`)
}

// 2. Command Registry & Menu Surface Translation Coverage
console.log('[2/5] Testing Keynote Menus (9) and Menu Commands (74) translations...')
{
  const commands = flattenCommands(KEYNOTE_MENUS)

  // Verify all 9 menus translate in both languages
  setLocale('en-US')
  for (const menu of KEYNOTE_MENUS) {
    const enLabel = t(menu.id)
    assert.ok(enLabel && enLabel !== menu.id, `Menu "${menu.id}" must have English translation`)
  }

  setLocale('pt-BR')
  for (const menu of KEYNOTE_MENUS) {
    const ptLabel = t(menu.id)
    assert.ok(ptLabel && ptLabel !== menu.id, `Menu "${menu.id}" must have Portuguese translation`)
  }

  // Key menu translations parity check
  assert.equal(t('file'), 'Arquivo')
  assert.equal(t('edit'), 'Editar')
  assert.equal(t('insert'), 'Inserir')
  assert.equal(t('slide'), 'Slide')
  assert.equal(t('format'), 'Formatar')
  assert.equal(t('arrange'), 'Dispor')
  assert.equal(t('view'), 'Visualizar')
  assert.equal(t('play'), 'Reproduzir')
  assert.equal(t('help'), 'Ajuda')

  // Verify all 74 command IDs translate in both languages
  for (const cmd of commands) {
    setLocale('en-US')
    const enLabel = t(cmd.id)
    assert.ok(enLabel && enLabel !== cmd.id, `Command "${cmd.id}" missing English label`)

    setLocale('pt-BR')
    const ptLabel = t(cmd.id)
    assert.ok(ptLabel && ptLabel !== cmd.id, `Command "${cmd.id}" missing Portuguese label`)
  }

  // Spot check specific Apple Keynote Portuguese terminology
  assert.equal(t('file.new'), 'Nova Apresentação')
  assert.equal(t('file.open'), 'Abrir…')
  assert.equal(t('file.versions'), 'Explorar Todas as Versões…')
  assert.equal(t('edit.undo'), 'Desfazer')
  assert.equal(t('edit.redo'), 'Refazer')
  assert.equal(t('insert.shape'), 'Forma')
  assert.equal(t('slide.add'), 'Novo Slide')
  assert.equal(t('slide.skip'), 'Ocultar Slide')
  assert.equal(t('format.inspector'), 'Mostrar Inspetor de Formato')
  assert.equal(t('arrange.group'), 'Agrupar')
  assert.equal(t('view.navigator'), 'Navegador de Slides')
  assert.equal(t('play.current'), 'Do Slide Atual')

  console.log(`  PASS: All 9 Keynote menus and ${commands.length} commands verified in en-US and pt-BR.`)
}

// 3. Locale Normalization & Resolution Priority
console.log('[3/5] Testing locale normalization and detection hierarchy...')
{
  // Test normalizeLocale
  assert.equal(normalizeLocale('pt'), 'pt-BR')
  assert.equal(normalizeLocale('pt-BR'), 'pt-BR')
  assert.equal(normalizeLocale('pt_BR'), 'pt-BR')
  assert.equal(normalizeLocale('PT-br'), 'pt-BR')
  assert.equal(normalizeLocale('en'), 'en-US')
  assert.equal(normalizeLocale('en-US'), 'en-US')
  assert.equal(normalizeLocale('en_US'), 'en-US')
  assert.equal(normalizeLocale('es'), null)
  assert.equal(normalizeLocale(''), null)
  assert.equal(normalizeLocale(null), null)
  assert.equal(normalizeLocale(undefined), null)

  // Priority Hierarchy Mocking Test
  const mockStorage: Record<string, string> = {}
  let mockCookieString = ''
  let mockSearchString = ''

  // Provide browser globals
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  const originalLocalStorage = globalThis.localStorage

  // @ts-ignore
  globalThis.localStorage = {
    getItem: (k: string) => mockStorage[k] ?? null,
    setItem: (k: string, v: string) => { mockStorage[k] = v },
    removeItem: (k: string) => { delete mockStorage[k] },
  }
  // @ts-ignore
  globalThis.document = {
    get cookie() { return mockCookieString },
    set cookie(val: string) { mockCookieString = val },
    documentElement: { lang: '' },
  }
  // @ts-ignore
  globalThis.window = {
    get location() {
      return {
        search: mockSearchString,
      } as any
    },
  }

  try {
    // 4. Default: No URL, No Cookie, No Storage -> English First
    mockSearchString = ''
    mockCookieString = ''
    delete mockStorage[LOCALSTORAGE_KEY_LOCALE]
    assert.equal(detectLocale(), 'en-US', 'Priority 4: Must default to English First (en-US)')

    // 3. LocalStorage set to pt-BR -> pt-BR
    mockStorage[LOCALSTORAGE_KEY_LOCALE] = 'pt-BR'
    assert.equal(detectLocale(), 'pt-BR', 'Priority 3: LocalStorage should be respected when no URL/cookie')

    // 2. Cookie set to en-US overrides LocalStorage pt-BR -> en-US
    mockCookieString = `${COOKIE_KEY_LOCALE}=en-US`
    assert.equal(detectLocale(), 'en-US', 'Priority 2: Cookie overrides LocalStorage')

    // 2b. Cookie set to pt-BR overrides LocalStorage en-US -> pt-BR
    mockStorage[LOCALSTORAGE_KEY_LOCALE] = 'en-US'
    mockCookieString = `${COOKIE_KEY_LOCALE}=pt-BR`
    assert.equal(detectLocale(), 'pt-BR', 'Priority 2: Cookie overrides LocalStorage')

    // 1. URL parameter overrides everything: ?locale=en-US overrides pt-BR cookie and pt-BR storage
    mockSearchString = '?locale=en-US'
    assert.equal(detectLocale(), 'en-US', 'Priority 1: URL param ?locale= overrides Cookie and LocalStorage')

    // 1b. URL parameter ?lang=pt overrides everything
    mockSearchString = '?lang=pt'
    mockCookieString = `${COOKIE_KEY_LOCALE}=en-US`
    mockStorage[LOCALSTORAGE_KEY_LOCALE] = 'en-US'
    assert.equal(detectLocale(), 'pt-BR', 'Priority 1: URL param ?lang= overrides Cookie and LocalStorage')

    // Test setLocale updates storage, cookie, and document lang
    setLocale('pt-BR')
    assert.equal(currentLocale.value, 'pt-BR')
    assert.equal(mockStorage[LOCALSTORAGE_KEY_LOCALE], 'pt-BR')
    assert.ok(mockCookieString.includes(`${COOKIE_KEY_LOCALE}=pt-BR`))
    assert.equal((globalThis.document as any).documentElement.lang, 'pt-BR')

    setLocale('en-US')
    assert.equal(currentLocale.value, 'en-US')
    assert.equal(mockStorage[LOCALSTORAGE_KEY_LOCALE], 'en-US')
    assert.ok(mockCookieString.includes(`${COOKIE_KEY_LOCALE}=en-US`))
    assert.equal((globalThis.document as any).documentElement.lang, 'en-US')
  }
  finally {
    // Restore original globals
    // @ts-ignore
    globalThis.window = originalWindow
    // @ts-ignore
    globalThis.document = originalDocument
    // @ts-ignore
    globalThis.localStorage = originalLocalStorage
  }

  console.log('  PASS: Strict 4-tier detection hierarchy (URL -> Cookie -> LocalStorage -> English First) verified.')
}

// 4. Interpolation & Fallback Integrity
console.log('[4/5] Testing parameter interpolation and fallback behavior...')
{
  setLocale('en-US')
  assert.equal(
    t('inspector.slideLayout.slideOf', undefined, { current: 4, total: 20 }),
    'Slide 4 of 20',
  )

  setLocale('pt-BR')
  assert.equal(
    t('inspector.slideLayout.slideOf', undefined, { current: 4, total: 20 }),
    'Slide 4 de 20',
  )

  // Fallback to explicit default parameter if key does not exist
  assert.equal(t('some.unknown.key', 'Fallback Label'), 'Fallback Label')

  // Fallback to key itself if no fallback provided
  assert.equal(t('some.unknown.key'), 'some.unknown.key')

  console.log('  PASS: Dynamic token replacement and fallback cascades verified.')
}

// 5. Available Locales Surface
console.log('[5/5] Testing available locales definition...')
{
  assert.equal(AVAILABLE_LOCALES.length, 2)
  assert.equal(AVAILABLE_LOCALES[0].code, 'en-US')
  assert.equal(AVAILABLE_LOCALES[1].code, 'pt-BR')
  console.log('  PASS: Supported locales available for UI pickers.')
}

console.log('\n=== ALL i18n & PORTUGUESE TRANSLATION TESTS PASSED ===')
