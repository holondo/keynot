<template>
  <div class="canvas-tool toolbar-row" :class="`tier-${tier}`">
    <!-- Mobile: one bottom dock owns history, insertion and the two drawers. -->
    <FloatingRail v-if="tier === 'mobile'" class="mobile-tool-dock" aria-label="Presentation controls">
      <PillButton size="touch" icon-only :disabled="!canUndo" :hint="t('toolbar.undo')" @click="undo()"><i-icon-park-outline:undo /></PillButton>
      <PillButton size="touch" icon-only :disabled="!canRedo" :hint="t('toolbar.redo')" @click="redo()"><i-icon-park-outline:redo /></PillButton>
      <RailDivider />
      <PillButton size="touch" icon-only class="mobile-tools-trigger" aria-haspopup="dialog" :hint="t('toolbar.insert', 'Insert')" @click="emit('openTools')"><i-icon-park-outline:plus /></PillButton>
      <RailDivider />
      <PillButton
        v-if="editorViewMode === 'navigator'"
        size="touch"
        icon-only
        class="toggle-thumbnails"
        :aria-expanded="overlayState === 'thumbnails'"
        :active="overlayState === 'thumbnails'"
        :hint="t('toolbar.navigator')"
        @click="toggleOverlay('thumbnails')"
      ><i-icon-park-outline:left-bar /></PillButton>
      <PillButton
        size="touch"
        icon-only
        class="toggle-inspector"
        :aria-expanded="overlayState === 'inspector'"
        :active="overlayState === 'inspector'"
        hint="Inspector"
        @click="toggleOverlay('inspector')"
      ><i-icon-park-outline:format-brush /></PillButton>
    </FloatingRail>

    <template v-else>
    <!-- Flat hierarchy: each cluster owns one glass rail; controls inside are quiet pills. -->
    <FloatingRail class="toolbar-cluster view-cluster">
      <Popover trigger="click" v-model:value="viewMenuVisible" placement="bottom-start" :offset="8">
        <template #content>
          <div class="menu-section-title">{{ t('toolbar.presentationView') }}</div>
          <PopoverMenuItem v-for="mode in viewModes" :key="mode.value" @click="setEditorView(mode.value)">
            <component :is="mode.icon" class="icon" /> {{ mode.label }}
            <span class="sub-check" v-if="editorViewMode === mode.value">✓</span>
          </PopoverMenuItem>
          <Divider :margin="4" />
          <div class="menu-section-title">{{ t('toolbar.overlaysPanes') }}</div>
          <PopoverMenuItem v-for="pane in paneToggles" :key="pane.label" @click="pane.toggle(); viewMenuVisible = false">
            <component :is="pane.icon" class="icon" /> {{ pane.label }}
            <span class="sub-check" v-if="pane.on">✓</span>
          </PopoverMenuItem>
          <Divider :margin="4" />
          <PopoverMenuItem @click="toggleSearchPanel(); viewMenuVisible = false">
            <i-icon-park-outline:search class="icon" /> {{ t('toolbar.findReplace') }}
          </PopoverMenuItem>
        </template>
        <PillButton :aria-expanded="viewMenuVisible" :hint="t('toolbar.viewOptions')">
          <i-icon-park-outline:layout-two />
          <i-icon-park-outline:down class="mini-caret" />
        </PillButton>
      </Popover>

      <Popover trigger="click" v-model:value="canvasScaleVisible" placement="bottom" :offset="8">
        <template #content>
          <PopoverMenuItem center v-for="item in canvasScalePresetList" :key="item" @click="applyCanvasPresetScale(item)">{{ item }}%</PopoverMenuItem>
          <PopoverMenuItem center @click="resetCanvas(); canvasScaleVisible = false">{{ t('toolbar.fitSlide') }}</PopoverMenuItem>
        </template>
        <PillButton class="zoom-pill" :aria-expanded="canvasScaleVisible" :hint="t('toolbar.zoomLevel')">
          <span class="zoom-value">{{ canvasScalePercentage }}</span>
          <i-icon-park-outline:down class="mini-caret" />
        </PillButton>
      </Popover>
    </FloatingRail>

    <FloatingRail class="toolbar-cluster slide-cluster">
      <PillButton class="play-main" variant="accent" icon-only :hint="t('toolbar.playSlideshow')" :shortcut="commandShortcut('play.current')" @click="enterScreening()">
        <i-icon-park-solid:play-one />
      </PillButton>
      <Popover trigger="click" v-model:value="playMenuVisible" placement="bottom" :offset="8">
        <template #content>
          <PopoverMenuItem @click="enterScreeningFromStart(); playMenuVisible = false">
            <i-icon-park-outline:slide-two class="icon" /> {{ t('toolbar.playFromBeginning') }}
          </PopoverMenuItem>
          <PopoverMenuItem @click="enterScreening(); playMenuVisible = false">
            <i-icon-park-outline:ppt class="icon" /> {{ t('toolbar.playFromCurrent') }}
          </PopoverMenuItem>
        </template>
        <PillButton caret :aria-expanded="playMenuVisible" :hint="t('toolbar.playbackOptions')"><i-icon-park-outline:down /></PillButton>
      </Popover>

      <RailDivider />

      <PillButton icon-only :hint="t('toolbar.addSlide')" :shortcut="commandShortcut('slide.add')" @click="createSlide()">
        <i-icon-park-outline:plus />
      </PillButton>
      <Popover trigger="click" v-model:value="templateMenuVisible" placement="bottom-start" :offset="8" :title="t('toolbar.addSlide')">
        <template #content>
          <PopoverMenuItem @click="openThemeChooser(); templateMenuVisible = false">
            <i-icon-park-outline:theme class="icon" /> {{ t('toolbar.chooseTheme') }}
          </PopoverMenuItem>
          <PopoverMenuItem @click="createSlide(); templateMenuVisible = false">
            <i-icon-park-outline:plus class="icon" /> {{ t('toolbar.addSlide') }}
          </PopoverMenuItem>
          <Templates
            @select="slide => { createSlideByTemplate(slide); templateMenuVisible = false }"
            @selectAll="({ slides, theme }) => { insertAllTemplates({ slides, theme }); templateMenuVisible = false }"
          />
        </template>
        <PillButton caret :aria-expanded="templateMenuVisible" :hint="t('toolbar.addSlide')"><i-icon-park-outline:down /></PillButton>
      </Popover>

      <RailDivider />

      <PillButton class="ai-capsule-btn" :icon-only="tier !== 'desktop'" :hint="t('toolbar.aiStudio')" @click="openAIPPTDialog()">
        <i-icon-park-outline:magic-wand />
        <span v-if="tier === 'desktop'">{{ t('toolbar.aiStudio') }}</span>
      </PillButton>
    </FloatingRail>

    <FloatingRail class="toolbar-cluster center-cluster insert-cluster" scrollable>
      <Popover trigger="click" v-model:value="tableGeneratorVisible" :offset="8">
        <template #content>
          <TableGenerator
            @close="tableGeneratorVisible = false"
            @insert="({ row, col }) => { createTableElement(row, col); tableGeneratorVisible = false }"
          />
        </template>
        <PillButton icon-only :aria-expanded="tableGeneratorVisible" hint="Insert Table"><i-icon-park-outline:insert-table /></PillButton>
      </Popover>

      <Popover trigger="click" v-model:value="chartPoolVisible" :offset="8">
        <template #content>
          <ChartPool @select="payload => { createChartElement(payload.type, payload.themeColors); chartPoolVisible = false }" />
        </template>
        <PillButton icon-only :aria-expanded="chartPoolVisible" hint="Insert Chart"><i-icon-park-outline:chart-histogram /></PillButton>
      </Popover>

      <PillButton icon-only :active="creatingElement?.type === 'text'" hint="Insert Text Box" @click="drawText()"><i-icon-park-outline:text /></PillButton>
      <Popover trigger="click" v-model:value="textTypeSelectVisible" :offset="8">
        <template #content>
          <PopoverMenuItem @click="() => { drawText(); textTypeSelectVisible = false }">
            <i-icon-park-outline:text-rotation-none class="icon" /> Horizontal Text Box
          </PopoverMenuItem>
          <PopoverMenuItem @click="() => { drawText(true); textTypeSelectVisible = false }">
            <i-icon-park-outline:text-rotation-down class="icon" /> Vertical Text Box
          </PopoverMenuItem>
        </template>
        <PillButton caret :aria-expanded="textTypeSelectVisible" hint="Text Orientation"><i-icon-park-outline:down /></PillButton>
      </Popover>

      <Popover trigger="click" v-model:value="shapePoolVisible" :offset="8">
        <template #content>
          <ShapePool
            @select="shape => drawShape(shape)"
            @drawPen="() => { svgPathEditorVisible = true; shapePoolVisible = false }"
          />
        </template>
        <PillButton icon-only :active="creatingCustomShape || creatingElement?.type === 'shape'" hint="Insert Shape"><i-icon-park-outline:graphic-design /></PillButton>
      </Popover>
      <Popover trigger="click" v-model:value="shapeMenuVisible" :offset="8">
        <template #content>
          <PopoverMenuItem @click="shapeMenuVisible = false; shapePoolVisible = true">
            <i-icon-park-outline:graphic-design class="icon" /> Shape Library
          </PopoverMenuItem>
          <PopoverMenuItem @click="() => { svgPathEditorVisible = true; shapeMenuVisible = false }">
            <i-icon-park-outline:connection class="icon" /> Draw with Pen (Bezier)
          </PopoverMenuItem>
          <PopoverMenuItem @click="() => { drawCustomShape(); shapeMenuVisible = false }">
            <i-icon-park-outline:writing-fluently class="icon" /> Freeform Polygon
          </PopoverMenuItem>
        </template>
        <PillButton caret :aria-expanded="shapeMenuVisible" hint="Shape Options"><i-icon-park-outline:down /></PillButton>
      </Popover>

      <Popover trigger="click" v-model:value="linePoolVisible" :offset="8">
        <template #content>
          <LinePool @select="line => drawLine(line)" />
        </template>
        <PillButton icon-only :active="creatingElement?.type === 'line'" hint="Insert Line"><i-icon-park-outline:connection /></PillButton>
      </Popover>

      <Popover trigger="click" v-model:value="mediaMenuVisible" :offset="8">
        <template #content>
          <FileInput @change="files => { insertImageElement(files); mediaMenuVisible = false }">
            <PopoverMenuItem><i-icon-park-outline:picture class="icon" /> Choose Photo / Image...</PopoverMenuItem>
          </FileInput>
          <PopoverMenuItem @click="openImageLibPanel(); mediaMenuVisible = false">
            <i-icon-park-outline:pic class="icon" /> Photo Gallery Library
          </PopoverMenuItem>
          <PopoverMenuItem @click="mediaMenuVisible = false; mediaInputVisible = true">
            <i-icon-park-outline:video-two class="icon" /> Web Video or Audio...
          </PopoverMenuItem>
          <PopoverMenuItem @click="mediaMenuVisible = false; latexEditorVisible = true">
            <i-icon-park-outline:formula class="icon" /> Equation (LaTeX)...
          </PopoverMenuItem>
          <PopoverMenuItem @click="toggleSymbolPanel(); mediaMenuVisible = false">
            <i-icon-park-outline:symbol class="icon" /> Symbols &amp; Emoji
          </PopoverMenuItem>
        </template>
        <PillButton icon-only :aria-expanded="mediaMenuVisible" hint="Insert Media (Photos, Video, Equations)"><i-icon-park-outline:picture-album /></PillButton>
      </Popover>

      <RailDivider />

      <PillButton icon-only class="comment-pill" :active="showNotesPanel" hint="Slide Comments & Notes" @click="toggleNotesPanel()">
        <i-icon-park-outline:comment />
      </PillButton>
    </FloatingRail>

    <!-- Undo / Redo stays visible in its own hierarchy bubble. -->
    <FloatingRail class="toolbar-cluster history-cluster">
      <PillButton icon-only :disabled="!canUndo" :hint="t('toolbar.undo')" :shortcut="commandShortcut('edit.undo')" @click="undo()"><i-icon-park-outline:undo /></PillButton>
      <PillButton icon-only :disabled="!canRedo" :hint="t('toolbar.redo')" :shortcut="commandShortcut('edit.redo')" @click="redo()"><i-icon-park-outline:redo /></PillButton>
    </FloatingRail>

    <!-- Tablet: the inspector is a drawer, toggled from the row it sits under. -->
    <FloatingRail v-if="tier === 'tablet'" class="toolbar-cluster drawer-cluster">
      <PillButton
        icon-only
        class="toggle-inspector"
        :active="overlayState === 'inspector'"
        :aria-expanded="overlayState === 'inspector'"
        hint="Inspector"
        @click="toggleOverlay('inspector')"
      ><i-icon-park-outline:format-brush /></PillButton>
    </FloatingRail>
    </template>

    <!-- Modals -->
    <Modal v-model:visible="mediaInputVisible" :width="520">
      <MediaInput
        @close="mediaInputVisible = false"
        @insertVideo="({ src, ext }) => { createVideoElement(src, ext); mediaInputVisible = false }"
        @insertAudio="({ src, ext }) => { createAudioElement(src, ext); mediaInputVisible = false }"
      />
    </Modal>

    <Modal
      v-model:visible="latexEditorVisible" 
      :width="880"
    >
      <LaTeXEditor 
        @close="latexEditorVisible = false"
        @update="data => { createLatexElement(data); latexEditorVisible = false }"
      />
    </Modal>

    <Modal
      v-model:visible="svgPathEditorVisible" 
      :width="800"
    >
      <SVGPathEditor
        @close="svgPathEditorVisible = false"
        @insert="path => insertSvgPath(path)"
      />
    </Modal>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore, useSnapshotStore } from '@/store'
import { t } from '@/i18n'
import { getImageDataURL } from '@/utils/image'
import type { ShapePoolItem } from '@/configs/shapes'
import type { LinePoolItem } from '@/configs/lines'
import type { PPTShapeElement, Slide, SlideTheme } from '@/types/slides'
import useScaleCanvas from '@/hooks/useScaleCanvas'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useCreateElement from '@/hooks/useCreateElement'
import useSlideHandler from '@/hooks/useSlideHandler'
import useScreening from '@/hooks/useScreening'
import useAddSlidesOrElements from '@/hooks/useAddSlidesOrElements'

import ShapePool from './ShapePool.vue'
import LinePool from './LinePool.vue'
import ChartPool from './ChartPool.vue'
import TableGenerator from './TableGenerator.vue'
import MediaInput from './MediaInput.vue'
import SVGPathEditor from './SVGPathEditor.vue'
import Templates from '../Thumbnails/Templates.vue'
import LaTeXEditor from '@/components/LaTeXEditor/index.vue'
import FileInput from '@/components/FileInput.vue'
import Modal from '@/components/Modal.vue'
import Popover from '@/components/Popover.vue'
import PopoverMenuItem from '@/components/PopoverMenuItem.vue'
import Divider from '@/components/Divider.vue'
import FloatingRail from '@/components/ui/FloatingRail.vue'
import RailDivider from '@/components/ui/RailDivider.vue'
import useEditorOverlay from '@/hooks/useEditorOverlay'
import { commandShortcut } from '@/utils/shortcut'
import IconLayoutTwo from '~icons/icon-park-outline/layout-two'
import IconExpandLeft from '~icons/icon-park-outline/expand-left'
import IconViewGridCard from '~icons/icon-park-outline/view-grid-card'
import IconNotes from '~icons/icon-park-outline/notes'
import IconRuler from '~icons/icon-park-outline/ruler'
import IconMoveOne from '~icons/icon-park-outline/move-one'
import IconComment from '~icons/icon-park-outline/comment'
import PillButton from '@/components/ui/PillButton.vue'
import useBreakpoint from '@/hooks/useBreakpoint'

const emit = defineEmits<{ openTools: [] }>()
const { tier } = useBreakpoint()
const { overlayState, toggleOverlay } = useEditorOverlay()

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const {
  creatingElement,
  creatingCustomShape,
  showSelectPanel,
  showSearchPanel,
  showNotesPanel,
  showSymbolPanel,
  showRuler,
  editorViewMode,
  showPresenterNotes,
} = storeToRefs(mainStore)
const { canUndo, canRedo } = storeToRefs(useSnapshotStore())
const { theme, viewportRatio, viewportSize } = storeToRefs(slidesStore)

const { redo, undo } = useHistorySnapshot()
const { createSlide, createSlideByTemplate, isEmptySlide } = useSlideHandler()
const { addSlidesFromData } = useAddSlidesOrElements()
const { enterScreening, enterScreeningFromStart } = useScreening()

const {
  setCanvasScalePercentage,
  resetCanvas,
  canvasScalePercentage,
} = useScaleCanvas()

const canvasScalePresetList = [200, 150, 125, 100, 75, 50]
const canvasScaleVisible = ref(false)
const viewMenuVisible = ref(false)
const templateMenuVisible = ref(false)
const playMenuVisible = ref(false)
const mediaMenuVisible = ref(false)

const viewModes = computed(() => [
  { value: 'navigator' as const, label: t('toolbar.navigator'), icon: IconLayoutTwo },
  { value: 'slideOnly' as const, label: t('toolbar.slideOnly'), icon: IconExpandLeft },
  { value: 'lightTable' as const, label: t('toolbar.lightTable'), icon: IconViewGridCard },
])
const paneToggles = computed(() => [
  { label: t('toolbar.presenterNotes'), icon: IconNotes, on: showPresenterNotes.value, toggle: () => togglePresenterNotes() },
  { label: t('toolbar.rulers'), icon: IconRuler, on: showRuler.value, toggle: () => toggleRuler() },
  { label: t('toolbar.objectList'), icon: IconMoveOne, on: showSelectPanel.value, toggle: () => toggleSelectPanel() },
  { label: t('toolbar.commentsPane'), icon: IconComment, on: showNotesPanel.value, toggle: () => toggleNotesPanel() },
])

const applyCanvasPresetScale = (value: number) => {
  setCanvasScalePercentage(value)
  canvasScaleVisible.value = false
}

const insertAllTemplates = ({ slides, theme }: { slides: Slide[], theme: Partial<SlideTheme> }) => {
  if (isEmptySlide.value) slidesStore.setSlides(slides, theme)
  else addSlidesFromData(slides)
}

const {
  createImageElement,
  createChartElement,
  createTableElement,
  createLatexElement,
  createVideoElement,
  createAudioElement,
  createShapeElement,
} = useCreateElement()

const insertImageElement = (files: FileList) => {
  const imageFile = files[0]
  if (!imageFile) return
  getImageDataURL(imageFile).then(dataURL => createImageElement(dataURL))
}

const shapePoolVisible = ref(false)
const linePoolVisible = ref(false)
const chartPoolVisible = ref(false)
const tableGeneratorVisible = ref(false)
const mediaInputVisible = ref(false)
const latexEditorVisible = ref(false)
const svgPathEditorVisible = ref(false)
const textTypeSelectVisible = ref(false)
const shapeMenuVisible = ref(false)

const drawText = (vertical = false) => {
  mainStore.setCreatingElement({
    type: 'text',
    vertical,
  })
}

const drawShape = (shape: ShapePoolItem) => {
  mainStore.setCreatingElement({
    type: 'shape',
    data: shape,
  })
  shapePoolVisible.value = false
}

const drawCustomShape = () => {
  mainStore.setCreatingCustomShapeState(true)
  shapePoolVisible.value = false
}

const insertSvgPath = (path: string) => {
  const width = 400
  const height = 400
  const isClosedPath = /z\s*$/i.test(path)
  const position = {
    width,
    height,
    left: (viewportSize.value - width) / 2,
    top: (viewportSize.value * viewportRatio.value - height) / 2,
  }
  const supplement: Partial<PPTShapeElement> = isClosedPath
    ? { fill: theme.value.themeColors[0] }
    : {
      fill: 'rgba(0, 0, 0, 0)',
      outline: {
        width: 2,
        color: theme.value.themeColors[0],
        style: 'solid',
      },
    }

  createShapeElement(position, {
    path,
    viewBox: [width, height],
  }, supplement)
  svgPathEditorVisible.value = false
}

const drawLine = (line: LinePoolItem) => {
  mainStore.setCreatingElement({
    type: 'line',
    data: line,
  })
  linePoolVisible.value = false
}

const toggleRuler = () => {
  mainStore.setRulerState(!showRuler.value)
}

const toggleSelectPanel = () => {
  mainStore.setSelectPanelState(!showSelectPanel.value)
}

const setEditorView = (mode: 'navigator' | 'slideOnly' | 'lightTable') => {
  mainStore.setEditorViewMode(mode)
  viewMenuVisible.value = false
}

const togglePresenterNotes = () => {
  mainStore.togglePresenterNotes()
}

const toggleSearchPanel = () => {
  mainStore.setSearchPanelState(!showSearchPanel.value)
}

const toggleNotesPanel = () => {
  mainStore.setNotesPanelState(!showNotesPanel.value)
}

const toggleSymbolPanel = () => {
  mainStore.setSymbolPanelState(!showSymbolPanel.value)
}

const openImageLibPanel = () => {
  mainStore.setImageLibPanelState(true)
}

const openAIPPTDialog = () => {
  mainStore.setAIPPTDialogState(true)
}

const openThemeChooser = () => {
  mainStore.setThemeChooserVisible(true)
}
</script>

<style lang="scss" scoped>
/* Flat hierarchy: each cluster owns one glass rail; nothing inside it is glass. */
.canvas-tool {
  height: 100%;
  max-width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  user-select: none;
  color: var(--text-primary);
}
.toolbar-cluster {
  flex: 0 0 auto;
  &.insert-cluster { flex: 0 1 auto; scroll-snap-type: x proximity; }
}
.mini-caret { width: 10px !important; height: 10px !important; color: var(--text-tertiary); margin-left: -2px; }
.zoom-value { min-width: 34px; text-align: right; font-variant-numeric: tabular-nums; }
.ai-capsule-btn { color: #8e44ec; }
.menu-section-title {
  padding: 6px 10px 2px;
  font-size: var(--text-xs);
  font-weight: var(--weight-strong);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: .04em;
}
.sub-check { margin-left: auto; padding-left: 16px; }
.mobile-tool-dock { max-width: 100%; }
</style>
