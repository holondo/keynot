<template>
  <div class="keynot-editor" :class="`tier-${tier}`" :data-tier="tier">
    <EditorHeader class="layout-header" />
    <CanvasTool class="layout-toolbar" />
    <div class="layout-content">
      <!-- Light Table View Mode -->
      <LightTable v-if="editorViewMode === 'lightTable'" class="layout-light-table" />

      <!-- Standard Navigator & Slide-Only Modes -->
      <template v-else>
        <Thumbnails
          v-if="editorViewMode === 'navigator' && (tier !== 'mobile' || thumbnailsOpen)"
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
          v-show="tier === 'desktop' || inspectorOpen"
          class="layout-content-right"
          :class="{ overlay: tier !== 'desktop' }"
        />
        <div
          v-if="tier !== 'desktop' && (inspectorOpen || thumbnailsOpen)"
          class="layout-scrim"
          @click="inspectorOpen = false; thumbnailsOpen = false"
        ></div>
        <div class="layout-fabs" v-if="tier !== 'desktop'">
          <button
            v-if="tier === 'mobile' && editorViewMode === 'navigator'"
            class="layout-fab toggle-thumbnails"
            :aria-expanded="thumbnailsOpen"
            aria-label="Slides"
            @click="thumbnailsOpen = !thumbnailsOpen; inspectorOpen = false"
          ><i-icon-park-outline:layout-four /></button>
          <button
            class="layout-fab toggle-inspector"
            :aria-expanded="inspectorOpen"
            aria-label="Inspector"
            @click="inspectorOpen = !inspectorOpen; thumbnailsOpen = false"
          ><i-icon-park-outline:setting-config /></button>
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

const mainStore = useMainStore()
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
const inspectorOpen = ref(false)
const thumbnailsOpen = ref(false)
watch(tier, () => {
  inspectorOpen.value = false
  thumbnailsOpen.value = false
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

  @include bp(tablet) {
    --thumbs-w: 128px;
  }
}
.layout-header {
  height: var(--header-h);
  flex-shrink: 0;
  position: relative;
  z-index: 1000;
  overflow: visible;
}
.layout-toolbar {
  height: var(--toolbar-h);
  flex-shrink: 0;
  position: relative;
  z-index: 20;
  overflow-x: auto;
  overflow-y: visible;
  scrollbar-width: none;
}
.layout-content {
  flex: 1;
  min-height: 0;
  display: flex;
  position: relative;
}
.layout-content-left {
  width: var(--thumbs-w);
  height: 100%;
  flex-shrink: 0;

  &.overlay {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 60;
    width: min(220px, 70vw);
    box-shadow: 8px 0 24px rgba(0, 0, 0, 0.18);
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
  height: 100%;
  flex-shrink: 0;

  &.overlay {
    position: absolute;
    right: 0;
    top: 0;
    z-index: 60;
    width: min(var(--inspector-width, 270px), 90vw);
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
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
  background: var(--bg-elevated, rgba(255, 255, 255, 0.9));
  color: var(--text-primary, #1d1d1f);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;

  &[aria-expanded="true"] {
    background: var(--accent, #007aff);
    color: #fff;
  }
}
@keyframes inspector-in {
  from { transform: translateX(24px); opacity: 0; }
}
</style>