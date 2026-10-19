<template>
  <div class="keynot-editor">
    <EditorHeader class="layout-header" />
    <CanvasTool class="layout-toolbar" />
    <div class="layout-content">
      <!-- Light Table View Mode -->
      <LightTable v-if="editorViewMode === 'lightTable'" class="layout-light-table" />

      <!-- Standard Navigator & Slide-Only Modes -->
      <template v-else>
        <Thumbnails v-if="editorViewMode === 'navigator'" class="layout-content-left" />
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
        <Toolbar class="layout-content-right" />
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
import { ref } from 'vue'
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

useGlobalHotkey()
usePasteEvent()
</script>

<style lang="scss" scoped>
.keynot-editor {
  height: 100%;
  background-color: var(--bg-app, #f5f5f7);
  color: var(--text-primary, #1d1d1f);
}
.layout-header {
  height: 38px;
  position: relative;
  z-index: 1000;
  overflow: visible;
}
.layout-toolbar {
  height: 46px;
  position: relative;
  z-index: 20;
}
.layout-content {
  height: calc(100% - 84px);
  display: flex;
}
.layout-content-left {
  width: 176px;
  height: 100%;
  flex-shrink: 0;
}
.layout-content-center {
  width: calc(100% - 176px - var(--inspector-width, 270px));
  height: 100%;
  transition: width 0.18s ease;

  &.full-canvas {
    width: calc(100% - var(--inspector-width, 270px));
  }
}
.layout-light-table {
  width: 100%;
  height: 100%;
}
.layout-content-right {
  width: var(--inspector-width, 270px);
  height: 100%;
  flex-shrink: 0;
}
</style>
