<template>
  <div class="editor-header document-row">
    <FloatingRail class="left">
      <Popover trigger="click" placement="bottom-start" v-model:value="mainMenuVisible">
        <template #content>
          <div class="main-menu">
            <div class="ai-menu" @click="openAIPPTDialog(); mainMenuVisible = false">
              <div class="icon"><i-custom:click /></div>
              <div class="aippt-content">
                <div class="aippt"><span>{{ t('header.aiStudioTitle') }}</span></div>
                <div class="aippt-subtitle">{{ t('header.aiStudioSubtitle') }}</div>
              </div>
            </div>
          </div>
          <Divider :margin="10" />
          <div class="import-section">
            <div class="import-label">{{ t('header.importSectionTitle') }}</div>
            <div class="import-grid">
              <FileInput class="import-block keynote-block" accept=".key,application/vnd.apple.keynote" @change="files => handleKeynoteImport(files)">
                <span class="icon"><i-icon-park-outline:key-one /></span>
                <span class="label">.KEY</span>
                <span class="sub-label">{{ t('header.importKeynoteDesc') }}</span>
              </FileInput>
              <FileInput class="import-block" accept="application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx" @change="files => {
                importPPTXFile(files)
                mainMenuVisible = false
              }">
                <span class="icon"><i-custom:file-ppt /></span>
                <span class="label">PPTX</span>
                <span class="sub-label">{{ t('header.importPptxDesc') }}</span>
              </FileInput>
              <FileInput class="import-block" accept=".pptist,.keynot,.slate,.json" @change="files => {
                importSpecificFile(files)
                mainMenuVisible = false
              }">
                <span class="icon"><i-custom:file-pptist /></span>
                <span class="label">KEYNOT</span>
                <span class="sub-label">{{ t('header.importKeynotDesc') }}</span>
              </FileInput>
            </div>
          </div>
          <Divider :margin="10" />
          <PopoverMenuItem class="popover-menu-item" @click="projectManagerVisible = true; mainMenuVisible = false"><i-icon-park-outline:folder-open class="icon" /> {{ t('header.allPresentations') }}</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="compatibilityModalVisible = true; mainMenuVisible = false"><i-icon-park-outline:check-correct class="icon" /> {{ t('header.compatibilityReport') }}</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="setDialogForExport('keynote')"><i-icon-park-outline:download class="icon" /> {{ t('header.exportCopy') }}</PopoverMenuItem>
          <Divider :margin="10" />
          <PopoverMenuItem class="popover-menu-item" @click="openThemeChooser(); mainMenuVisible = false"><i-icon-park-outline:theme class="icon" /> {{ t('header.chooseTheme') }}</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="resetSlides(); mainMenuVisible = false"><i-icon-park-outline:refresh class="icon" /> {{ t('header.newBlank') }}</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="openMarkupPanel(); mainMenuVisible = false"><i-icon-park-outline:mark class="icon" /> {{ t('header.slideTags') }}</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="mainMenuVisible = false; hotkeyDrawerVisible = true"><i-icon-park-outline:command class="icon" /> {{ t('header.shortcuts') }}</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="mainMenuVisible = false; preferencesModalVisible = true"><i-icon-park-outline:setting-two class="icon" /> {{ t('header.preferences') }}</PopoverMenuItem>
          <Divider :margin="10" />
          <div class="statement">{{ t('header.statement') }}</div>
        </template>
        <PillButton
          class="app-menu-btn"
          :icon-only="tier !== 'desktop'"
          :size="tier === 'mobile' ? 'touch' : 'regular'"
          :aria-label="t('header.appMenu', 'KeyNot')"
          hint="KeyNot File Menu & Import"
        >
          <span class="app-logo"><i-icon-park-outline:ppt /></span>
          <template v-if="tier === 'desktop'">
            <span class="app-name">KeyNot</span>
            <i-icon-park-outline:down class="caret" />
          </template>
        </PillButton>
      </Popover>

      <KeynoteMenuBar
        ref="commandMenu"
        :disabled-command-ids="disabledMenuCommandIds"
        :checked-command-ids="checkedMenuCommandIds"
        @execute="executeMenuCommand"
        @mobile-open-change="open => emit('mobileMenuState', open)"
      />
      <input ref="openFileInput" class="native-file-input" type="file" accept=".key,.pptx,.pptist,.keynot,.slate,.json" @change="handleNativeFileOpen" />
      <input ref="imageFileInput" class="native-file-input" type="file" accept="image/*" @change="handleNativeImageOpen" />
    </FloatingRail>

    <FloatingRail class="center-title">
      <Input
        class="title-input"
        ref="titleInputRef"
        v-model:value="titleValue"
        @blur="handleUpdateTitle()"
        @enter="handleUpdateTitle()"
        v-if="editingTitle"
      ></Input>
      <button v-else class="title-text" :title="title" @click="startEditTitle()">
        <span class="name">{{ title }}</span><span class="ext">.key</span>
      </button>

      <PillButton
        class="save-status-pill"
        size="compact"
        :class="saveStatus"
        :icon-only="tier !== 'desktop'"
        :aria-label="saveStatusLabel"
        :hint="t('header.manageTooltip')"
        @click="projectManagerVisible = true"
      >
        <span class="dot"></span>
        <span v-if="tier === 'desktop'">{{ saveStatusLabel }}</span>
      </PillButton>
      <span class="offline-pill" v-if="isOffline">Offline</span>
    </FloatingRail>

    <FloatingRail class="right">
      <template v-if="tier === 'mobile'">
        <PillButton class="header-pill play-pill" variant="accent" size="touch" icon-only :aria-label="t('toolbar.playSlideshow')" @click="enterScreening()">
          <i-icon-park-solid:play-one />
        </PillButton>
      </template>
      <template v-else>
        <PillButton
          class="header-pill report-pill"
          v-if="compatibilityReport && tier === 'desktop'"
          :hint="t('header.compatibilityReport')"
          @click="compatibilityModalVisible = true"
        >
          <i-icon-park-outline:check-correct />
          <span>{{ compatibilityReport.measures.visualFidelity.score === null ? '—' : `${compatibilityReport.measures.visualFidelity.score}%` }}</span>
        </PillButton>

        <FileInput
          class="header-file-action"
          accept=".key,application/vnd.apple.keynote,.pptx"
          @change="files => handleQuickFileOpen(files)"
        >
          <PillButton class="header-pill" :icon-only="tier !== 'desktop'" aria-label="Open .key" hint="Open .key">
            <i-icon-park-outline:folder-open />
            <span v-if="tier === 'desktop'">Open</span>
          </PillButton>
        </FileInput>

        <PillButton class="header-pill" :icon-only="tier !== 'desktop'" :aria-label="t('header.export')" :hint="t('header.export')" @click="setDialogForExport('keynote')">
          <i-icon-park-outline:export />
          <span v-if="tier === 'desktop'">{{ t('header.export') }}</span>
        </PillButton>

        <PillButton class="header-pill" icon-only :aria-label="t('header.preferences')" :hint="t('header.preferences')" @click="preferencesModalVisible = true">
          <i-icon-park-outline:setting-two />
        </PillButton>

        <PillButton
          class="header-pill primary-pill"
          v-if="deferredInstallPrompt"
          :icon-only="tier !== 'desktop'"
          aria-label="Install KeyNot"
          @click="installPWA()"
        >
          <i-icon-park-outline:computer />
          <span v-if="tier === 'desktop'">Install</span>
        </PillButton>
      </template>
    </FloatingRail>

    <Drawer
      :width="340"
      v-model:visible="hotkeyDrawerVisible"
      placement="right"
    >
      <HotkeyDoc />
      <template v-slot:title>Keyboard Shortcuts</template>
    </Drawer>

    <Modal v-model:visible="compatibilityModalVisible" :width="680">
      <CompatibilityReportModal @close="compatibilityModalVisible = false" />
    </Modal>

    <Modal v-model:visible="projectManagerVisible" :width="600">
      <ProjectManagerModal @close="projectManagerVisible = false" />
    </Modal>

    <Modal v-model:visible="versionHistoryVisible" :width="620">
      <VersionHistoryModal @close="versionHistoryVisible = false" />
    </Modal>

    <Modal v-model:visible="preferencesModalVisible" :width="560">
      <PreferencesModal @close="preferencesModalVisible = false" />
    </Modal>

    <Modal v-model:visible="mediaInputVisible" :width="520">
      <MediaInput
        @close="mediaInputVisible = false"
        @insertVideo="({ src, ext }) => { createVideoElement(src, ext); mediaInputVisible = false }"
        @insertAudio="({ src, ext }) => { createAudioElement(src, ext); mediaInputVisible = false }"
      />
    </Modal>

    <Modal v-model:visible="latexEditorVisible" :width="880">
      <LaTeXEditor
        @close="latexEditorVisible = false"
        @update="data => { createLatexElement(data); latexEditorVisible = false }"
      />
    </Modal>

    <FullscreenSpin :loading="exporting" tip="Importing presentation..." />
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import useScreening from '@/hooks/useScreening'
import useImport from '@/hooks/useImport'
import useSlideHandler from '@/hooks/useSlideHandler'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useCopyAndPasteElement from '@/hooks/useCopyAndPasteElement'
import useDeleteElement from '@/hooks/useDeleteElement'
import useSelectElement from '@/hooks/useSelectElement'
import useCombineElement from '@/hooks/useCombineElement'
import useAlignActiveElement from '@/hooks/useAlignActiveElement'
import useOrderElement from '@/hooks/useOrderElement'
import useLockElement from '@/hooks/useLockElement'
import useCreateElement from '@/hooks/useCreateElement'
import { ElementAlignCommands, ElementOrderCommands } from '@/types/edit'
import { flattenCommands, KEYNOTE_MENUS } from '@/commands/keynoteCommands'
import type { DialogForExportTypes } from '@/types/export'
import { getImageDataURL } from '@/utils/image'
import emitter, { EmitterEvents } from '@/utils/emitter'

import HotkeyDoc from './HotkeyDoc.vue'
import CompatibilityReportModal from './CompatibilityReportModal.vue'
import ProjectManagerModal from './ProjectManagerModal.vue'
import VersionHistoryModal from './VersionHistoryModal.vue'
import PreferencesModal from './PreferencesModal.vue'
import { useI18n } from '@/i18n'
import MediaInput from '@/views/Editor/CanvasTool/MediaInput.vue'
import LaTeXEditor from '@/components/LaTeXEditor/index.vue'
import FileInput from '@/components/FileInput.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import Drawer from '@/components/Drawer.vue'
import Modal from '@/components/Modal.vue'
import Input from '@/components/Input.vue'
import Popover from '@/components/Popover.vue'
import PopoverMenuItem from '@/components/PopoverMenuItem.vue'
import Divider from '@/components/Divider.vue'
import FloatingRail from '@/components/ui/FloatingRail.vue'
import PillButton from '@/components/ui/PillButton.vue'
import KeynoteMenuBar from './KeynoteMenuBar.vue'
import useBreakpoint from '@/hooks/useBreakpoint'

const emit = defineEmits<{ mobileMenuState: [open: boolean] }>()
const commandMenu = ref<InstanceType<typeof KeynoteMenuBar> | null>(null)
defineExpose({
  openCommandMenu: (menuId?: string) => commandMenu.value?.open(menuId),
  executeCommand: (id: string) => executeMenuCommand(id),
})

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { title, saveStatus, compatibilityReport, currentSlide } = storeToRefs(slidesStore)

const { enterScreening, enterScreeningFromStart } = useScreening()
const { importSpecificFile, importPPTXFile, importKeynoteFile, exporting } = useImport()
const { resetSlides, createSlide, copyAndPasteSlide, deleteSlide, copySlide, cutSlide, pasteSlide, selectAllSlide } = useSlideHandler()
const { undo, redo, addHistorySnapshot } = useHistorySnapshot()
const { copyElement, cutElement, pasteElement, quickCopyElement } = useCopyAndPasteElement()
const { deleteElement } = useDeleteElement()
const { selectAllElements } = useSelectElement()
const { combineElements, uncombineElements } = useCombineElement()
const { alignActiveElement } = useAlignActiveElement()
const { orderElement } = useOrderElement()
const { lockElement } = useLockElement()
const {
  createTableElement,
  createChartElement,
  createImageElement,
  createVideoElement,
  createAudioElement,
  createLatexElement,
} = useCreateElement()

const supportedMenuCommandIds = new Set([
  'file.new', 'file.open', 'file.workspace', 'file.theme', 'file.versions',
  'file.export.keynote', 'file.export.powerpoint', 'file.export.pdf', 'file.export.images', 'file.compatibility', 'file.preferences',
  'edit.undo', 'edit.redo', 'edit.cut', 'edit.copy', 'edit.paste', 'edit.duplicate', 'edit.delete', 'edit.select-all', 'edit.find',
  'insert.slide', 'insert.text', 'insert.shape.rectangle', 'insert.shape.circle', 'insert.shape.line', 'insert.table', 'insert.chart',
  'insert.media.image', 'insert.media.video', 'insert.media.audio', 'insert.latex', 'insert.comment',
  'slide.add', 'slide.duplicate', 'slide.delete', 'slide.skip', 'slide.layout', 'slide.background', 'slide.notes',
  'format.inspector', 'format.animate', 'format.document',
  'format.font.bold', 'format.font.italic', 'format.font.underline',
  'arrange.front', 'arrange.forward', 'arrange.backward', 'arrange.back',
  'arrange.align.left', 'arrange.align.center', 'arrange.align.right',
  'arrange.group', 'arrange.ungroup', 'arrange.lock',
  'view.navigator', 'view.slide-only', 'view.light-table', 'view.rulers', 'view.object-list', 'view.comments', 'view.dark-mode',
  'play.beginning', 'play.current', 'play.rehearse',
  'help.shortcuts', 'help.keynote', 'help.about',
])

const disabledMenuCommandIds = computed(() => {
  const disabled = flattenCommands(KEYNOTE_MENUS)
    .filter(command => !command.children && !supportedMenuCommandIds.has(command.id))
    .map(command => command.id)
  const selectedCount = mainStore.activeElementIdList.length
  if (!selectedCount) {
    disabled.push(
      'arrange.front', 'arrange.forward', 'arrange.backward', 'arrange.back',
      'arrange.align.left', 'arrange.align.center', 'arrange.align.right',
      'arrange.group', 'arrange.ungroup', 'arrange.lock',
    )
  }
  if (selectedCount < 2) disabled.push('arrange.align.left', 'arrange.align.center', 'arrange.align.right', 'arrange.group')
  if (!mainStore.activeElementList.some(element => element.groupId)) disabled.push('arrange.ungroup')
  return disabled
})

const checkedMenuCommandIds = computed(() => [
  mainStore.editorViewMode === 'navigator' ? 'view.navigator' : '',
  mainStore.editorViewMode === 'slideOnly' ? 'view.slide-only' : '',
  mainStore.editorViewMode === 'lightTable' ? 'view.light-table' : '',
  mainStore.showRuler ? 'view.rulers' : '',
  mainStore.showSelectPanel ? 'view.object-list' : '',
  mainStore.showNotesPanel ? 'view.comments' : '',
  mainStore.colorMode === 'dark' ? 'view.dark-mode' : '',
  mainStore.showPresenterNotes ? 'slide.notes' : '',
  currentSlide.value?.skipped ? 'slide.skip' : '',
].filter(Boolean))

const { currentLocale, setLocale, t } = useI18n()
const { tier } = useBreakpoint()
const saveStatusLabel = computed(() => {
  if (saveStatus.value === 'saving') return t('header.saving')
  if (saveStatus.value === 'backed_up') return t('header.backedUp')
  if (saveStatus.value === 'unsaved') return t('header.unsaved')
  return t('header.saved')
})
const mainMenuVisible = ref(false)
const preferencesModalVisible = ref(false)
const hotkeyDrawerVisible = ref(false)
const compatibilityModalVisible = ref(false)
const projectManagerVisible = ref(false)
const versionHistoryVisible = ref(false)
const mediaInputVisible = ref(false)
const latexEditorVisible = ref(false)
const editingTitle = ref(false)
const titleValue = ref('')
const titleInputRef = useTemplateRef<InstanceType<typeof Input>>('titleInputRef')
const openFileInput = useTemplateRef<HTMLInputElement>('openFileInput')
const imageFileInput = useTemplateRef<HTMLInputElement>('imageFileInput')

const handleNativeImageOpen = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  getImageDataURL(input.files[0]).then(dataURL => createImageElement(dataURL))
  input.value = ''
}

const isOffline = ref(!navigator.onLine)
const deferredInstallPrompt = ref<any>(null)

const handleKeynoteImport = (files: FileList) => {
  importKeynoteFile(files)
  mainMenuVisible.value = false
  window.setTimeout(() => {
    compatibilityModalVisible.value = true
  }, 450)
}

const handleQuickFileOpen = (files: FileList) => {
  const file = files[0]
  if (!file) return
  if (file.name.toLowerCase().endsWith('.pptx')) {
    importPPTXFile(files)
  }
  else {
    handleKeynoteImport(files)
  }
}

const handleNativeFileOpen = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const name = input.files[0].name.toLowerCase()
  if (name.endsWith('.key') || name.endsWith('.pptx')) handleQuickFileOpen(input.files)
  else importSpecificFile(input.files)
  input.value = ''
}

const executeMenuCommand = (commandId: string) => {
  const elementSelected = mainStore.activeElementIdList.length > 0
  const actions: Record<string, () => void> = {
    'file.new': resetSlides,
    'file.open': () => openFileInput.value?.click(),
    'file.workspace': () => { projectManagerVisible.value = true },
    'file.theme': openThemeChooser,
    'file.versions': () => { versionHistoryVisible.value = true },
    'file.export.keynote': () => setDialogForExport('keynote'),
    'file.export.powerpoint': () => setDialogForExport('pptx'),
    'file.export.pdf': () => setDialogForExport('pdf'),
    'file.export.images': () => setDialogForExport('image'),
    'file.compatibility': () => { compatibilityModalVisible.value = true },
    'file.preferences': () => { preferencesModalVisible.value = true },
    'edit.undo': undo,
    'edit.redo': redo,
    'edit.cut': () => elementSelected ? cutElement() : cutSlide(),
    'edit.copy': () => elementSelected ? copyElement() : copySlide(),
    'edit.paste': () => mainStore.thumbnailsFocus ? pasteSlide() : pasteElement(),
    'edit.duplicate': () => elementSelected ? quickCopyElement() : copyAndPasteSlide(),
    'edit.delete': () => elementSelected ? deleteElement() : deleteSlide(),
    'edit.select-all': () => mainStore.editorAreaFocus ? selectAllElements() : selectAllSlide(),
    'edit.find': () => mainStore.setSearchPanelState(true),
    'insert.slide': createSlide,
    'insert.text': () => mainStore.setCreatingElement({ type: 'text' }),
    'insert.shape.rectangle': () => mainStore.setCreatingElement({
      type: 'shape',
      data: { viewBox: [200, 200], path: 'M 0 0 L 200 0 L 200 200 L 0 200 Z' },
    }),
    'insert.shape.circle': () => mainStore.setCreatingElement({
      type: 'shape',
      data: { viewBox: [200, 200], path: 'M 100 0 A 50 50 0 1 1 100 200 A 50 50 0 1 1 100 0 Z' },
    }),
    'insert.shape.line': () => mainStore.setCreatingElement({
      type: 'line',
      data: { path: 'M 0 0 L 20 20', style: 'solid', points: ['', ''] },
    }),
    'insert.table': () => createTableElement(5, 4),
    'insert.chart': () => createChartElement('bar'),
    'insert.media.image': () => imageFileInput.value?.click(),
    'insert.media.video': () => { mediaInputVisible.value = true },
    'insert.media.audio': () => { mediaInputVisible.value = true },
    'insert.latex': () => { latexEditorVisible.value = true },
    'insert.comment': () => mainStore.setNotesPanelState(!mainStore.showNotesPanel),
    'slide.add': createSlide,
    'slide.duplicate': copyAndPasteSlide,
    'slide.delete': () => deleteSlide(),
    'slide.skip': () => {
      if (!currentSlide.value) return
      slidesStore.updateSlide({ skipped: !currentSlide.value.skipped })
      addHistorySnapshot()
    },
    'slide.layout': openThemeChooser,
    'slide.background': () => {
      mainStore.setActiveElementIdList([])
      mainStore.setInspectorMode('format')
    },
    'slide.notes': () => mainStore.togglePresenterNotes(),
    'format.inspector': () => mainStore.setInspectorMode('format'),
    'format.animate': () => mainStore.setInspectorMode('animate'),
    'format.document': () => mainStore.setInspectorMode('document'),
    'format.font.bold': () => emitter.emit(EmitterEvents.RICH_TEXT_COMMAND, { action: { command: 'strong' } }),
    'format.font.italic': () => emitter.emit(EmitterEvents.RICH_TEXT_COMMAND, { action: { command: 'em' } }),
    'format.font.underline': () => emitter.emit(EmitterEvents.RICH_TEXT_COMMAND, { action: { command: 'underline' } }),
    'arrange.front': () => mainStore.handleElement && orderElement(mainStore.handleElement, ElementOrderCommands.TOP),
    'arrange.forward': () => mainStore.handleElement && orderElement(mainStore.handleElement, ElementOrderCommands.UP),
    'arrange.backward': () => mainStore.handleElement && orderElement(mainStore.handleElement, ElementOrderCommands.DOWN),
    'arrange.back': () => mainStore.handleElement && orderElement(mainStore.handleElement, ElementOrderCommands.BOTTOM),
    'arrange.align.left': () => alignActiveElement(ElementAlignCommands.LEFT),
    'arrange.align.center': () => alignActiveElement(ElementAlignCommands.HORIZONTAL),
    'arrange.align.right': () => alignActiveElement(ElementAlignCommands.RIGHT),
    'arrange.group': combineElements,
    'arrange.ungroup': uncombineElements,
    'arrange.lock': lockElement,
    'view.navigator': () => mainStore.setEditorViewMode('navigator'),
    'view.slide-only': () => mainStore.setEditorViewMode('slideOnly'),
    'view.light-table': () => mainStore.setEditorViewMode('lightTable'),
    'view.rulers': () => mainStore.setRulerState(!mainStore.showRuler),
    'view.object-list': () => mainStore.setSelectPanelState(!mainStore.showSelectPanel),
    'view.comments': () => mainStore.setNotesPanelState(!mainStore.showNotesPanel),
    'view.dark-mode': () => mainStore.setColorMode(mainStore.colorMode === 'dark' ? 'light' : 'dark'),
    'play.beginning': enterScreeningFromStart,
    'play.current': enterScreening,
    'play.rehearse': enterScreening,
    'help.shortcuts': () => { hotkeyDrawerVisible.value = true },
    'help.keynote': () => { compatibilityModalVisible.value = true },
    'help.about': () => { projectManagerVisible.value = true },
  }
  actions[commandId]?.()
}

const handleOnlineStatus = () => {
  isOffline.value = !navigator.onLine
}

const handleBeforeInstallPrompt = (e: Event) => {
  e.preventDefault()
  deferredInstallPrompt.value = e
}

onMounted(() => {
  window.addEventListener('online', handleOnlineStatus)
  window.addEventListener('offline', handleOnlineStatus)
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnlineStatus)
  window.removeEventListener('offline', handleOnlineStatus)
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
})

const installPWA = async () => {
  if (!deferredInstallPrompt.value) return
  deferredInstallPrompt.value.prompt()
  await deferredInstallPrompt.value.userChoice
  deferredInstallPrompt.value = null
}

const startEditTitle = () => {
  titleValue.value = title.value
  editingTitle.value = true
  nextTick(() => titleInputRef.value?.focus())
}

const handleUpdateTitle = () => {
  slidesStore.setTitle(titleValue.value)
  editingTitle.value = false
}

const setDialogForExport = (type: DialogForExportTypes) => {
  mainStore.setDialogForExport(type)
  mainMenuVisible.value = false
}

const openMarkupPanel = () => {
  mainStore.setMarkupPanelState(true)
}

const openAIPPTDialog = () => {
  mainStore.setAIPPTDialogState(true)
}

const openThemeChooser = () => {
  mainStore.setThemeChooserVisible(true)
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/glass-system.scss';
@import '@/assets/styles/breakpoints.scss';

/*
 * Flat hierarchy: glass belongs to rails; actions inside them stay quiet.
 * Side rails keep their natural width; the title rail is centered in the space between.
 */
.editor-header {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  user-select: none;
}
.left, .right { flex: 0 0 auto; }
.center-title { flex: 0 1 auto; min-width: 0; max-width: 420px; margin-inline: auto; }
.native-file-input { display: none; }

.app-menu-btn {
  font-weight: var(--weight-strong);
  .app-logo {
    width: 22px;
    height: 22px;
    border-radius: var(--radius-control);
    background: var(--accent-color);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    :deep(svg) { width: 13px; height: 13px; }
  }
  .caret { color: var(--text-tertiary); width: 10px; height: 10px; }
}

.title-text {
  @include flat-control;
  min-width: 0;
  height: var(--control-regular);
  padding: 0 12px;
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
  font-size: var(--text-md);
  font-weight: var(--weight-strong);
  .name { @include ellipsis-oneline(); }
  .ext { color: var(--text-tertiary); font-weight: var(--weight-regular); }
}
.title-input {
  width: 240px;
  max-width: 100%;
  height: var(--control-compact);
  border-radius: var(--radius-pill);
}

.save-status-pill {
  color: var(--text-secondary);
  font-weight: var(--weight-regular);
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-green); flex: 0 0 auto; }
  &.saving .dot { background: #ffcc00; }
  &.unsaved { color: #ff9500; .dot { background: #ff9500; } }
}
.offline-pill {
  padding: 0 8px;
  font-size: var(--text-xs);
  font-weight: var(--weight-strong);
  color: #b25000;
}
.report-pill { color: var(--accent-color); }
.header-file-action { display: inline-flex; }

/* App (project) menu content */
.main-menu { width: min(310px, calc(100vw - 48px)); }
.popover-menu-item .icon { font-size: var(--text-lg); }
.statement {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  padding: 4px 10px 6px;
}
.ai-menu {
  border-radius: var(--radius-menu-item);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: color-mix(in srgb, var(--accent-color) 10%, transparent);
  color: var(--accent-color);
  cursor: pointer;
  &:hover { background: color-mix(in srgb, var(--accent-color) 16%, transparent); }
  .icon { font-size: 20px; }
  .aippt-content { display: flex; flex-direction: column; gap: 2px; }
  .aippt { font-weight: var(--weight-strong); font-size: var(--text-md); }
  .aippt-subtitle { font-size: var(--text-sm); color: var(--text-secondary); }
}
.import-section {
  padding: 2px 0;
  .import-label {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    margin: 0 4px 6px;
    font-weight: var(--weight-strong);
    text-transform: uppercase;
    letter-spacing: .04em;
  }
  .import-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
  .import-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 10px 4px;
    border-radius: var(--radius-menu-item);
    background: var(--bg-control);
    color: var(--text-primary);
    cursor: pointer;
    &:hover { background: var(--bg-hover); }
    .icon { font-size: 20px; color: var(--accent-color); }
    .label { font-size: var(--text-sm); font-weight: var(--weight-strong); }
    .sub-label { font-size: var(--text-xs); color: var(--text-tertiary); text-align: center; }
  }
}

@include bp(mobile) {
  .editor-header { gap: 6px; }
  .center-title { flex: 1 1 auto; max-width: none; justify-content: center; }
  .title-text { flex: 1 1 auto; justify-content: center; height: var(--control-touch); }
}
</style>
