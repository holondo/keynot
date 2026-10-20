<template>
  <div class="keynot-editor" :class="[`tier-${tier}`, `view-${editorViewMode}`]" :data-tier="tier">
    <!-- Canvas-first floating shell: the canvas fills the free area, chrome floats above it. -->
    <div class="layout-header">
      <EditorHeader ref="editorHeader" @mobile-menu-state="handleMobileMenuState" />
    </div>
    <div class="layout-toolbar">
      <CanvasTool @open-tools="editorHeader?.openCommandMenu('insert')" />
    </div>
    <div class="layout-content">
      <LightTable v-if="editorViewMode === 'lightTable'" class="layout-light-table" />

      <template v-else>
        <Thumbnails
          v-if="editorViewMode === 'navigator' && (tier !== 'mobile' || overlayState === 'thumbnails')"
          ref="thumbnailsPanel"
          class="layout-panel layout-content-left"
          :class="{ overlay: tier === 'mobile' }"
        />
        <div class="layout-content-center">
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
        <div
          v-show="tier === 'desktop' || overlayState === 'inspector'"
          ref="inspectorPanel"
          class="layout-panel layout-content-right"
          :class="{ overlay: tier !== 'desktop' }"
        >
          <!-- Phone: the inspector is a resizable sheet; drag the grabber to resize or dismiss. -->
          <div v-if="tier === 'mobile'" ref="inspectorHandle" class="panel-handle" aria-hidden="true"><span class="panel-grabber"></span></div>
          <Toolbar class="inspector-body-host" />
        </div>
        <div
          v-if="tier !== 'desktop' && (overlayState === 'inspector' || overlayState === 'thumbnails')"
          class="layout-scrim"
          @click="closeOverlay"
        ></div>
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
import { computed, ref, watch } from 'vue'
import useBreakpoint from '@/hooks/useBreakpoint'
import useEditorOverlay from '@/hooks/useEditorOverlay'
import { useBackHandler } from '@/hooks/useBackStack'
import useSheetDrag from '@/hooks/useSheetDrag'
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
const { overlayState, openOverlay, closeOverlay } = useEditorOverlay()
// The menu overlay has its own sheet entry; drawers get one here.
useBackHandler(() => overlayState.value === 'thumbnails' || overlayState.value === 'inspector', closeOverlay)
const handleMobileMenuState = (open: boolean) => {
  if (open) openOverlay('menu')
  else if (overlayState.value === 'menu') closeOverlay()
}
watch(tier, () => {
  closeOverlay()
})

// Touch gestures for the compact drawers (same physics as every other sheet).
const thumbnailsPanel = ref<InstanceType<typeof Thumbnails> | null>(null)
const inspectorPanel = ref<HTMLElement | null>(null)
const inspectorHandle = ref<HTMLElement | null>(null)
const thumbnailsDrawer = computed(() => tier.value === 'mobile' && overlayState.value === 'thumbnails' ? thumbnailsPanel.value?.$el as HTMLElement ?? null : null)
useSheetDrag({ surface: thumbnailsDrawer, handle: thumbnailsDrawer, axis: 'x', dismissDirection: -1, touchAction: 'pan-y', onDismiss: closeOverlay })
const inspectorSheet = useSheetDrag({
  surface: computed(() => tier.value === 'mobile' ? inspectorPanel.value : null),
  handle: inspectorHandle,
  detents: [0.42, 0.8],
  onDismiss: closeOverlay,
})
watch(overlayState, state => {
  if (state !== 'inspector') return
  inspectorSheet.reset()
  inspectorSheet.applyDetent()
}, { flush: 'post' })

useGlobalHotkey()
usePasteEvent()
</script>

<style lang="scss" scoped>
@import '@/assets/styles/glass-system.scss';

/*
 * Geometry tokens for the floating shell. Every floating element and the
 * canvas free area derive from these, so chrome never covers the slide.
 */
.keynot-editor {
  --edge: 12px;
  --row-h: 44px;
  --header-top: calc(var(--edge) + env(safe-area-inset-top));
  --toolbar-top: calc(var(--header-top) + var(--row-h) + 8px);
  --panel-top: calc(var(--toolbar-top) + var(--row-h) + var(--edge));
  --panel-bottom: var(--edge);
  --thumbs-w: 184px;
  --inspector-w: var(--inspector-width, 280px);
  --canvas-left: calc(var(--thumbs-w) + var(--edge) * 2);
  --canvas-right: calc(var(--inspector-w) + var(--edge) * 2);
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: var(--bg-app);
  color: var(--text-primary);

  &.tier-tablet {
    --thumbs-w: 140px;
    --canvas-right: var(--edge);
  }
  &.tier-mobile {
    --edge: 8px;
    --dock-h: 52px;
    --toolbar-top: auto;
    --panel-top: calc(var(--header-top) + var(--row-h) + var(--edge));
    --panel-bottom: calc(var(--dock-h) + var(--edge) * 3 + env(safe-area-inset-bottom));
    --canvas-left: 0px;
    --canvas-right: 0px;
  }
  &.view-slideOnly { --canvas-left: var(--edge); }
}

.layout-header {
  position: absolute;
  top: var(--header-top);
  left: var(--edge);
  right: var(--edge);
  height: var(--row-h);
  z-index: 1000;
}
.layout-toolbar {
  position: absolute;
  top: var(--toolbar-top);
  left: var(--edge);
  right: var(--edge);
  height: var(--row-h);
  z-index: 90;
  display: flex;
  justify-content: center;
  pointer-events: none;
  > * { pointer-events: auto; }
}
.layout-content {
  position: absolute;
  inset: 0;
}
/* The canvas is the whole screen; chrome floats on it. The slide fits the free area via --fit-*. */
.layout-content-center {
  position: absolute;
  inset: 0;
  --fit-top: var(--panel-top);
  --fit-bottom: var(--panel-bottom);
  --fit-left: var(--canvas-left);
  --fit-right: var(--canvas-right);
}
.layout-light-table {
  position: absolute;
  inset: var(--panel-top) var(--edge) var(--panel-bottom);
  width: auto;
  height: auto;
}

/* Docked glass panels (navigator and inspector) share one surface. */
.layout-panel {
  @include glass-surface(regular);
  position: absolute;
  top: var(--panel-top);
  bottom: var(--panel-bottom);
  z-index: 40;
  height: auto;
  border-radius: var(--radius-panel);
  /* clip, not hidden: hidden boxes can still be scrolled by focus/scrollIntoView. */
  overflow: hidden;
  overflow: clip;

  &.overlay {
    @include glass-surface(elevated);
    z-index: 60;
    box-shadow: var(--glass-shadow-lg);
    animation: panel-in var(--motion-regular) var(--ease-out);
  }
}
.layout-content-left {
  left: var(--edge);
  width: var(--thumbs-w);
  &.overlay { width: min(220px, 64vw); }
}
.layout-content-right {
  display: flex;
  flex-direction: column;
  right: var(--edge);
  width: min(var(--inspector-w), calc(100vw - var(--edge) * 2));
}
.inspector-body-host { flex: 1 1 auto; min-height: 0; }
.tier-mobile .layout-content-right.overlay {
  left: var(--edge);
  width: auto;
  top: auto;
  height: min(42dvh, calc(100% - var(--panel-top) - var(--panel-bottom)));
  max-height: calc(100% - var(--panel-top) - var(--panel-bottom));
}
.panel-handle {
  flex: 0 0 auto;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}
.panel-grabber {
  width: 36px;
  height: 5px;
  border-radius: var(--radius-pill);
  background: var(--text-tertiary);
  opacity: .45;
}
.layout-scrim {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: var(--scrim);
}
.tier-mobile .layout-toolbar {
  top: auto;
  bottom: calc(var(--edge) * 1.5 + env(safe-area-inset-bottom));
  height: var(--dock-h);
}
@keyframes panel-in {
  from { transform: translateY(12px); opacity: 0; }
}
</style>
