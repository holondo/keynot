<template>
  <div class="editor-header">
    <div class="left">
      <Popover trigger="click" placement="bottom-start" v-model:value="mainMenuVisible">
        <template #content>
          <div class="main-menu">
            <div class="ai-menu" @click="openAIPPTDialog(); mainMenuVisible = false">
              <div class="icon"><i-custom:click /></div>
              <div class="aippt-content">
                <div class="aippt"><span>KeyNot AI Deck Studio</span></div>
                <div class="aippt-subtitle">Generate structured slides from a topic prompt</div>
              </div>
            </div>
          </div>
          <Divider :margin="10" />
          <div class="import-section">
            <div class="import-label">Open / Import Presentation</div>
            <div class="import-grid">
              <FileInput class="import-block keynote-block" accept=".key,application/vnd.apple.keynote" @change="files => handleKeynoteImport(files)">
                <span class="icon"><i-icon-park-outline:key-one /></span>
                <span class="label">.KEY</span>
                <span class="sub-label">(Apple Keynote)</span>
              </FileInput>
              <FileInput class="import-block" accept="application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx" @change="files => {
                importPPTXFile(files)
                mainMenuVisible = false
              }">
                <span class="icon"><i-custom:file-ppt /></span>
                <span class="label">PPTX</span>
                <span class="sub-label">(PowerPoint)</span>
              </FileInput>
              <FileInput class="import-block" accept=".pptist,.keynot,.slate,.json" @change="files => {
                importSpecificFile(files)
                mainMenuVisible = false
              }">
                <span class="icon"><i-custom:file-pptist /></span>
                <span class="label">KEYNOT</span>
                <span class="sub-label">(Project File)</span>
              </FileInput>
            </div>
          </div>
          <Divider :margin="10" />
          <PopoverMenuItem class="popover-menu-item" @click="projectManagerVisible = true; mainMenuVisible = false"><i-icon-park-outline:folder-open class="icon" /> All Presentations (Workspace)</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="compatibilityModalVisible = true; mainMenuVisible = false"><i-icon-park-outline:check-correct class="icon" /> Keynote Compatibility Report</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="setDialogForExport('keynote')"><i-icon-park-outline:download class="icon" /> Export to Keynote (.key) / PPTX / PDF</PopoverMenuItem>
          <Divider :margin="10" />
          <PopoverMenuItem class="popover-menu-item" @click="openThemeChooser(); mainMenuVisible = false"><i-icon-park-outline:theme class="icon" /> Choose a Theme...</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="resetSlides(); mainMenuVisible = false"><i-icon-park-outline:refresh class="icon" /> New Blank Presentation</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="openMarkupPanel(); mainMenuVisible = false"><i-icon-park-outline:mark class="icon" /> Slide Structure Tags</PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="mainMenuVisible = false; hotkeyDrawerVisible = true"><i-icon-park-outline:command class="icon" /> Keyboard Shortcuts</PopoverMenuItem>
          <Divider :margin="10" />
          <div class="statement">KeyNot • Apple Keynote Web Studio (Offline-First PWA)</div>
        </template>
        <div class="app-menu-btn" v-tooltip="'KeyNot File Menu & Import'">
          <span class="keynot-podium-icon">
            <i-icon-park-outline:ppt />
          </span>
          <span class="app-name">KeyNot</span>
          <i-icon-park-outline:down class="caret" />
        </div>
      </Popover>

      <KeynoteMenuBar
        :disabled-command-ids="disabledMenuCommandIds"
        :checked-command-ids="checkedMenuCommandIds"
        @execute="executeMenuCommand"
      />
      <input ref="openFileInput" class="native-file-input" type="file" accept=".key,.pptx,.pptist,.keynot,.slate,.json" @change="handleNativeFileOpen" />
    </div>

    <div class="center-title">
      <i-icon-park-outline:ppt class="doc-icon" />
      <Input 
        class="title-input" 
        ref="titleInputRef"
        v-model:value="titleValue" 
        @blur="handleUpdateTitle()" 
        @enter="handleUpdateTitle()"
        v-if="editingTitle" 
      ></Input>
      <div 
        class="title-text"
        @click="startEditTitle()"
        :title="title"
        v-else
      >{{ title }}<span class="ext">.key</span></div>

      <div
        class="save-status-pill"
        :class="saveStatus"
        @click="projectManagerVisible = true"
        v-tooltip="'Click to manage local presentations or export a backup'"
      >
        <span class="dot"></span>
        <span v-if="saveStatus === 'saving'">Saving…</span>
        <span v-else-if="saveStatus === 'backed_up'">Backed Up</span>
        <span v-else-if="saveStatus === 'unsaved'">Edited</span>
        <span v-else>Edited • Saved</span>
      </div>

      <div class="offline-pill" v-if="isOffline" v-tooltip="'Working offline — all changes saved locally in IndexedDB'">
        Offline
      </div>
    </div>

    <div class="right">
      <div
        class="header-pill report-pill"
        v-if="compatibilityReport"
        v-tooltip="'View Keynote Import Fidelity Report'"
        @click="compatibilityModalVisible = true"
      >
        <i-icon-park-outline:check-correct class="icon" />
        <span>Fidelity {{ compatibilityReport.measures.visualFidelity.score }}%</span>
      </div>

      <FileInput
        class="header-pill"
        accept=".key,application/vnd.apple.keynote,.pptx"
        v-tooltip="'Open Apple Keynote (.key) or PowerPoint (.pptx)'"
        @change="files => handleQuickFileOpen(files)"
      >
        <i-icon-park-outline:folder-open class="icon" />
        <span>Open .key</span>
      </FileInput>

      <div class="header-pill" v-tooltip="'Export Presentation (.key, .pptx, PDF)'" @click="setDialogForExport('keynote')">
        <i-icon-park-outline:share class="icon" />
        <span>Share / Export</span>
      </div>

      <div
        class="header-pill primary-pill"
        v-if="deferredInstallPrompt"
        v-tooltip="'Install KeyNot as a Desktop App'"
        @click="installPWA()"
      >
        <i-icon-park-outline:computer class="icon" />
        <span>Install KeyNot</span>
      </div>
    </div>

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
import { ElementAlignCommands, ElementOrderCommands } from '@/types/edit'
import { flattenCommands, KEYNOTE_MENUS } from '@/commands/keynoteCommands'
import type { DialogForExportTypes } from '@/types/export'

import HotkeyDoc from './HotkeyDoc.vue'
import CompatibilityReportModal from './CompatibilityReportModal.vue'
import ProjectManagerModal from './ProjectManagerModal.vue'
import FileInput from '@/components/FileInput.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import Drawer from '@/components/Drawer.vue'
import Modal from '@/components/Modal.vue'
import Input from '@/components/Input.vue'
import Popover from '@/components/Popover.vue'
import PopoverMenuItem from '@/components/PopoverMenuItem.vue'
import Divider from '@/components/Divider.vue'
import KeynoteMenuBar from './KeynoteMenuBar.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { title, saveStatus, compatibilityReport } = storeToRefs(slidesStore)

const { enterScreening, enterScreeningFromStart } = useScreening()
const { importSpecificFile, importPPTXFile, importKeynoteFile, exporting } = useImport()
const { resetSlides, createSlide, copyAndPasteSlide, deleteSlide, copySlide, cutSlide, pasteSlide, selectAllSlide } = useSlideHandler()
const { undo, redo } = useHistorySnapshot()
const { copyElement, cutElement, pasteElement, quickCopyElement } = useCopyAndPasteElement()
const { deleteElement } = useDeleteElement()
const { selectAllElements } = useSelectElement()
const { combineElements, uncombineElements } = useCombineElement()
const { alignActiveElement } = useAlignActiveElement()
const { orderElement } = useOrderElement()
const { lockElement } = useLockElement()

const supportedMenuCommandIds = new Set([
  'file.new', 'file.open', 'file.workspace', 'file.theme',
  'file.export.keynote', 'file.export.powerpoint', 'file.export.pdf', 'file.export.images', 'file.compatibility',
  'edit.undo', 'edit.redo', 'edit.cut', 'edit.copy', 'edit.paste', 'edit.duplicate', 'edit.delete', 'edit.select-all', 'edit.find',
  'insert.slide',
  'slide.add', 'slide.duplicate', 'slide.delete', 'slide.notes',
  'format.inspector', 'format.animate', 'format.document',
  'arrange.front', 'arrange.forward', 'arrange.backward', 'arrange.back',
  'arrange.align.left', 'arrange.align.center', 'arrange.align.right',
  'arrange.group', 'arrange.ungroup', 'arrange.lock',
  'view.navigator', 'view.slide-only', 'view.light-table', 'view.rulers', 'view.object-list', 'view.comments', 'view.dark-mode',
  'play.beginning', 'play.current',
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
].filter(Boolean))

const mainMenuVisible = ref(false)
const hotkeyDrawerVisible = ref(false)
const compatibilityModalVisible = ref(false)
const projectManagerVisible = ref(false)
const editingTitle = ref(false)
const titleValue = ref('')
const titleInputRef = useTemplateRef<InstanceType<typeof Input>>('titleInputRef')
const openFileInput = useTemplateRef<HTMLInputElement>('openFileInput')

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
    'file.export.keynote': () => setDialogForExport('keynote'),
    'file.export.powerpoint': () => setDialogForExport('pptx'),
    'file.export.pdf': () => setDialogForExport('pdf'),
    'file.export.images': () => setDialogForExport('image'),
    'file.compatibility': () => { compatibilityModalVisible.value = true },
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
    'slide.add': createSlide,
    'slide.duplicate': copyAndPasteSlide,
    'slide.delete': () => deleteSlide(),
    'slide.notes': () => mainStore.togglePresenterNotes(),
    'format.inspector': () => mainStore.setInspectorMode('format'),
    'format.animate': () => mainStore.setInspectorMode('animate'),
    'format.document': () => mainStore.setInspectorMode('document'),
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
.editor-header {
  background: var(--bg-header, rgba(245, 245, 247, 0.88));
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  color: var(--text-primary, #1d1d1f);
  user-select: none;
  border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  position: relative;
  z-index: 1000;
  overflow: visible;
}
.left, .right, .center-title {
  display: flex;
  align-items: center;
}
.native-file-input { display: none; }
.app-menu-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-primary, #1d1d1f);
  font-weight: 600;
  transition: background-color 0.15s;

  &:hover {
    background-color: var(--bg-control, rgba(0, 0, 0, 0.06));
  }

  .keynot-podium-icon {
    width: 20px;
    height: 20px;
    border-radius: 5px;
    background: linear-gradient(180deg, #32ade6 0%, #007aff 100%);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    box-shadow: 0 1px 3px rgba(0, 122, 255, 0.35);
  }

  .app-name {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.2px;
  }

  .caret {
    font-size: 11px;
    color: #86868b;
  }
}
.top-quick-links {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;

  .quick-link {
    padding: 3px 8px;
    border-radius: 5px;
    color: var(--text-secondary, #515154);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      color: var(--accent-color, #007aff);
      background-color: var(--bg-control, rgba(0, 122, 255, 0.08));
    }
  }
}
.center-title {
  gap: 6px;

  .doc-icon {
    color: var(--accent-color, #007aff);
    font-size: 14px;
  }

  .title-input {
    width: 220px;
    height: 26px;
    background: var(--bg-input, #ffffff);
    border-color: var(--accent-color, #007aff);

    ::v-deep(input) {
      height: 24px;
      line-height: 24px;
      color: var(--text-primary, #1d1d1f);
      font-size: 12px;
    }
  }

  .title-text {
    max-width: 320px;
    line-height: 24px;
    padding: 0 6px;
    border-radius: 5px;
    font-weight: 600;
    font-size: 12.5px;
    color: var(--text-primary, #1d1d1f);
    cursor: pointer;
    @include ellipsis-oneline();

    .ext {
      color: var(--text-tertiary, #86868b);
      font-weight: 400;
      margin-left: 1px;
    }

    &:hover {
      background-color: var(--bg-control, rgba(0, 0, 0, 0.05));
    }
  }
}
.save-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-control, rgba(0, 0, 0, 0.04));
  color: var(--text-secondary, #515154);
  cursor: pointer;

  &:hover {
    background: var(--bg-control-active, rgba(0, 0, 0, 0.08));
    color: var(--text-primary, #1d1d1f);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #34c759;
  }
  &.saving .dot {
    background: #ffcc00;
  }
  &.backed_up {
    color: #34c759;
    .dot {
      background: #34c759;
    }
  }
  &.unsaved {
    color: #ff9500;
    .dot {
      background: #ff9500;
    }
  }
}
.offline-pill {
  font-size: 10px;
  font-weight: 600;
  background: rgba(255, 204, 0, 0.2);
  color: #b25000;
  padding: 2px 7px;
  border-radius: 4px;
}
.right {
  gap: 6px;
}
.header-pill {
  height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-primary, #1d1d1f);
  background: var(--bg-control, rgba(0, 0, 0, 0.04));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  cursor: pointer;
  transition: all 0.15s;

  .icon {
    font-size: 13px;
    color: var(--text-secondary, #515154);
  }

  &:hover {
    background: var(--bg-control-active, rgba(0, 0, 0, 0.08));
    color: var(--text-primary, #000);
  }

  &.report-pill {
    background: rgba(0, 122, 255, 0.1);
    border-color: rgba(0, 122, 255, 0.25);
    color: var(--accent-color, #007aff);

    .icon {
      color: var(--accent-color, #007aff);
    }
  }

  &.primary-pill {
    background: var(--accent-color, #007aff);
    border-color: var(--accent-color, #007aff);
    color: #fff;

    .icon {
      color: #fff;
    }

    &:hover {
      background: #0062cc;
    }
  }
}
.popover-menu-item {
  display: flex;
  padding: 8px 10px;

  .icon {
    font-size: 18px;
    margin-right: 10px;
  }
}
.statement {
  font-size: 11.5px;
  color: var(--text-tertiary, #86868b);
  padding: 6px 10px;
}
.main-menu {
  width: 310px;
}
.ai-menu {
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.15), rgba(94, 92, 230, 0.18));
  color: var(--accent-color, #007aff);
  border: 1px solid rgba(10, 132, 255, 0.3);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;

  .icon {
    font-size: 22px;
    margin-right: 16px;
  }
  .aippt-content {
    display: flex;
    flex-direction: column;
  }
  .aippt {
    font-weight: 700;
    font-size: 15px;

    span {
      background: linear-gradient(90deg, #0a84ff, #5e5ce6);
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
    }
  }
  .aippt-subtitle {
    font-size: 12px;
    color: var(--text-secondary, #86868b);
    margin-top: 4px;
  }
}

.import-section {
  padding: 5px 0;

  .import-label {
    font-size: 12px;
    color: var(--text-tertiary, #86868b);
    margin-bottom: 6px;
    font-weight: 600;
  }
  .import-grid {
    display: flex;
    gap: 8px;
    justify-content: space-between;
  }
  .import-block {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px 6px;
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
    background: var(--bg-control, rgba(128, 128, 128, 0.08));
    color: var(--text-primary, #1d1d1f);
    transition: background-color .2s;
    cursor: pointer;
  
    &:hover {
      background-color: var(--bg-hover, rgba(128, 128, 128, 0.15));
    }
    &.keynote-block {
      border-color: var(--accent-color, #0a84ff);
      background: rgba(10, 132, 255, 0.1);
    }
    .icon {
      font-size: 22px;
      margin-bottom: 3px;
      color: var(--accent-color, #0a84ff);
    }
    .label {
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      color: var(--text-primary, #1d1d1f);
    }
    .sub-label {
      font-size: 10px;
      color: var(--text-tertiary, #86868b);
    }
  }
}
</style>