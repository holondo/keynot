<template>
  <div class="keynot-editor" :class="`tier-${tier}`" :data-tier="tier">
    <div class="layout-header">
      <EditorHeader ref="editorHeader" @mobile-menu-state="handleMobileMenuState" />
    </div>
    <div class="layout-toolbar">
      <CanvasTool @open-tools="editorHeader?.openCommandMenu()" />
    </div>
    <div class="layout-content">
      <!-- Light Table View Mode -->
      <LightTable v-if="editorViewMode === 'lightTable'" class="layout-light-table" />

      <!-- Standard Navigator & Slide-Only Modes -->
      <template v-else>
        <Thumbnails
          v-if="editorViewMode === 'navigator' && (tier !== 'mobile' || overlayState === 'thumbnails')"
          class="layout-content-left"
          :class="{ overlay: tier === 'mobile' }"
        />
        <div class="layout-content-center" :class="{ 'full-canvas': editorViewMode === 'slideOnly' }">
          <Canvas
            class="center-body" 
            :style="{ height: showPresenterNotes ? `calc(100% - ${remarkHeight}px)` : '100%' }" 
          />
          <Remark
            v-if="showPresenterNotes"
            class="center-bottom" 
            v-model:height="remarkHeight" 
            :style="{ height: `${remarkHeight}px` }"
          />
        </div>
        <Toolbar
          v-show="tier === 'desktop' || overlayState === 'inspector'"
          class="layout-content-right"
          :class="{ overlay: tier !== 'desktop' }"
        />
        <div
          v-if="tier !== 'desktop' && (overlayState === 'inspector' || overlayState === 'thumbnails')"
          class="layout-scrim"
          @click="closeOverlay"
        ></div>
        <div class="layout-fabs" v-if="tier !== 'desktop'">
          <PillButton
            v-if="tier === 'mobile' && editorViewMode === 'navigator'"
            class="layout-fab toggle-thumbnails"
            :aria-expanded="overlayState === 'thumbnails'"
            aria-label="Slides"
            @click="toggleOverlay('thumbnails')"
          ><i-icon-park-outline:layout-four /></PillButton>
          <PillButton
            class="layout-fab toggle-inspector"
            :aria-expanded="overlayState === 'inspector'"
            aria-label="Inspector"
            @click="toggleOverlay('inspector')"
          ><i-icon-park-outline:setting-config /></PillButton>
        </div>
      </template>
    </div>
  </div>

  <SelectPanel v-if="showSelectPanel" />
  <SearchPanel v-if="showSearchPanel" />
  <NotesPanel v-if="showNotesPanel" />
  <MarkupPanel v-if="showMarkupPanel" />
  <SymbolPanel v-if="showSymbolPanel" />
  <ImageLibPanel v-if="showImageLibPanel" />
  <ChartDataEditorDialog />
  <LatexEditorDialog />

  <Modal
    :visible="!!dialogForExport" 
    :width="680"
    @closed="closeExportDialog()"
  >
    <ExportDialog />
  </Modal>

  <Modal
    :visible="!!showAIPPTDialog" 
    :width="720"
    :closeOnClickMask="false"
    :closeOnEsc="false"
    closeButton
    :wrapStyle="{ opacity: showAIPPTDialog === 'running' ? 0 : 1 }"
    @closed="closeAIPPTDialog()"
  >
    <AIPPTDialog />
  </Modal>

  <Modal
    :visible="themeChooserVisible" 
    :width="880"
    @closed="mainStore.setThemeChooserVisible(false)"
  >
    <ThemeChooserModal />
  </Modal>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import useBreakpoint from '@/hooks/useBreakpoint'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import useGlobalHotkey from '@/hooks/useGlobalHotkey'
import usePasteEvent from '@/hooks/usePasteEvent'

import EditorHeader from './EditorHeader/index.vue'
import Canvas from './Canvas/index.vue'
import CanvasTool from './CanvasTool/index.vue'
import Thumbnails from './Thumbnails/index.vue'
import Toolbar from './Toolbar/index.vue'
import Remark from './Remark/index.vue'
import LightTable from './LightTable/index.vue'
import ChartDataEditorDialog from './ChartDataEditorDialog.vue'
import LatexEditorDialog from './LatexEditorDialog.vue'
import ExportDialog from './ExportDialog/index.vue'
import SelectPanel from './SelectPanel.vue'
import SearchPanel from './SearchPanel.vue'
import NotesPanel from './NotesPanel.vue'
import SymbolPanel from './SymbolPanel.vue'
import MarkupPanel from './MarkupPanel.vue'
import ImageLibPanel from './ImageLibPanel.vue'
import AIPPTDialog from './AIPPTDialog.vue'
import ThemeChooserModal from './ThemeChooserModal.vue'
import Modal from '@/components/Modal.vue'
import PillButton from '@/components/ui/PillButton.vue'

const mainStore = useMainStore()
const editorHeader = ref<InstanceType<typeof EditorHeader> | null>(null)
const {
  dialogForExport,
  showSelectPanel,
  showSearchPanel,
  showNotesPanel,
  showSymbolPanel,
  showMarkupPanel,
  showImageLibPanel,
  showAIPPTDialog,
  themeChooserVisible,
  editorViewMode,
  showPresenterNotes,
} = storeToRefs(mainStore)

const closeExportDialog = () => mainStore.setDialogForExport('')
const closeAIPPTDialog = () => mainStore.setAIPPTDialogState(false)

const remarkHeight = ref(120)

const { tier } = useBreakpoint()
type EditorOverlay = 'none' | 'menu' | 'thumbnails' | 'inspector'
const overlayState = ref<EditorOverlay>('none')
const openOverlay = (type: Exclude<EditorOverlay, 'none'>) => { overlayState.value = type }
const closeOverlay = () => { overlayState.value = 'none' }
const toggleOverlay = (type: Exclude<EditorOverlay, 'none' | 'menu'>) => {
  overlayState.value = overlayState.value === type ? 'none' : type
}
const handleMobileMenuState = (open: boolean) => {
  if (open) openOverlay('menu')
  else if (overlayState.value === 'menu') closeOverlay()
}
watch(tier, () => {
  closeOverlay()
})

useGlobalHotkey()
usePasteEvent()
</script>

<style lang="scss" scoped>
@import '@/assets/styles/breakpoints.scss';

.keynot-editor {
  --thumbs-w: 176px;
  --header-h: 38px;
  --toolbar-h: 46px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-app, #f5f5f7);
  color: var(--text-primary, #1d1d1f);
  position: relative;
  overflow: hidden;

  @include bp(tablet) {
    --thumbs-w: 128px;
  }

  &.tier-mobile {
    --header-h: 54px;
    --toolbar-h: 50px;
  }
}
.layout-header {
  /* Canvas-first floating shell: chrome is detached from document flow. */
  height: 44px;
  position: absolute;
  top: calc(10px + env(safe-area-inset-top));
  left: 10px;
  right: 10px;
  z-index: 1000;
  overflow: visible;
}
.layout-toolbar {
  height: 44px;
  position: absolute;
  top: calc(62px + env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  width: min(980px, calc(100% - 24px));
  z-index: 90;
  overflow: visible;
}
.layout-content {
  flex: 1;
  height: 100%;
  min-height: 0;
  display: flex;
  position: relative;
}
.layout-content-left {
  width: var(--thumbs-w);
  position: absolute;
  left: 12px;
  top: calc(118px + env(safe-area-inset-top));
  bottom: 12px;
  height: auto;
  z-index: 40;
  border-radius: 24px;
  overflow: hidden;
  background: var(--glass-surface-regular);
  border: 1px solid var(--glass-border-outer);
  box-shadow: var(--glass-shadow-md);
  backdrop-filter: blur(var(--glass-blur-regular));

  &.overlay {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 60;
    width: min(220px, 70vw);
    background: var(--glass-surface-elevated);
    border-right: 1px solid var(--glass-border-outer);
    box-shadow: var(--glass-shadow-lg);
    backdrop-filter: blur(var(--glass-blur-elevated));
  }
}
.layout-content-center {
  flex: 1;
  min-width: 0;
  height: 100%;
}
.layout-light-table {
  width: 100%;
  height: 100%;
}
.layout-content-right {
  width: var(--inspector-width, 270px);
  position: absolute;
  right: 12px;
  top: calc(118px + env(safe-area-inset-top));
  bottom: 12px;
  height: auto;
  z-index: 40;
  border-radius: 24px;
  overflow: hidden;
  background: var(--glass-surface-regular);
  border: 1px solid var(--glass-border-outer);
  box-shadow: var(--glass-shadow-md);
  backdrop-filter: blur(var(--glass-blur-regular));

  &.overlay {
    position: absolute;
    right: 0;
    top: 0;
    z-index: 60;
    width: min(var(--inspector-width, 270px), 90vw);
    background: var(--glass-surface-elevated);
    border-left: 1px solid var(--glass-border-outer);
    box-shadow: var(--glass-shadow-lg);
    backdrop-filter: blur(var(--glass-blur-elevated));
    animation: inspector-in 0.2s ease;
  }
}
.layout-scrim {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.25);
}
.layout-fabs {
  position: absolute;
  right: calc(16px + env(safe-area-inset-right));
  bottom: calc(16px + env(safe-area-inset-bottom));
  z-index: 70;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.layout-fab {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  background: var(--glass-surface-elevated);
  color: var(--text-primary, #1d1d1f);
  backdrop-filter: blur(var(--glass-blur-regular));
  box-shadow: var(--glass-shadow-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;

  &[aria-expanded="true"] {
    background: var(--accent-color, #007aff);
    color: #fff;
  }
}
@keyframes inspector-in {
  from { transform: translateX(24px); opacity: 0; }
}

.tier-mobile,
.tier-tablet {
  .layout-content-left,
  .layout-content-right {
    top: calc(112px + env(safe-area-inset-top));
    bottom: 10px;
  }
}
.tier-mobile {
  .layout-toolbar { width: calc(100% - 16px); top: auto; bottom: calc(12px + env(safe-area-inset-bottom)); height: 52px; }
  .layout-content-left.overlay,
  .layout-content-right.overlay {
    top: calc(70px + env(safe-area-inset-top));
    bottom: calc(132px + env(safe-area-inset-bottom));
    left: 8px;
    right: 8px;
    width: auto;
    max-width: 380px;
    margin-left: auto;
    border-radius: var(--radius-sheet);
  }
  .layout-content-left.overlay { margin-left: 0; max-width: 220px; }
  .layout-fabs { flex-direction: row; gap: 8px; bottom: calc(76px + env(safe-area-inset-bottom)); }
}
</style>
