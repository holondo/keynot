<template>
  <FloatingRail class="canvas-tool" scrollable>
    <!-- Left Floating Cluster: View | Zoom | Play | Add Slide | AI Studio | Undo/Redo -->
    <div class="toolbar-cluster left-cluster">
      <!-- View Capsule (Apple Keynote Style) -->
      <Popover trigger="click" v-model:value="viewMenuVisible" placement="bottom-start" :offset="8">
        <template #content>
          <div class="view-menu-section-title">{{ t('toolbar.presentationView') }}</div>
          <PopoverMenuItem class="popover-menu-item" @click="setEditorView('navigator')">
            <i-icon-park-outline:layout-two class="icon" /> {{ t('toolbar.navigator') }}
            <span class="sub-check" v-if="editorViewMode === 'navigator'">✓</span>
          </PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="setEditorView('slideOnly')">
            <i-icon-park-outline:expand-left class="icon" /> {{ t('toolbar.slideOnly') }}
            <span class="sub-check" v-if="editorViewMode === 'slideOnly'">✓</span>
          </PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="setEditorView('lightTable')">
            <i-icon-park-outline:view-grid-card class="icon" /> {{ t('toolbar.lightTable') }}
            <span class="sub-check" v-if="editorViewMode === 'lightTable'">✓</span>
          </PopoverMenuItem>

          <Divider :margin="6" />

          <div class="view-menu-section-title">{{ t('toolbar.overlaysPanes') }}</div>
          <PopoverMenuItem class="popover-menu-item" @click="togglePresenterNotes(); viewMenuVisible = false">
            <i-icon-park-outline:notes class="icon" /> {{ t('toolbar.presenterNotes') }}
            <span class="sub-check" v-if="showPresenterNotes">✓</span>
          </PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="toggleRuler(); viewMenuVisible = false">
            <i-icon-park-outline:ruler class="icon" /> {{ t('toolbar.rulers') }}
            <span class="sub-check" v-if="showRuler">✓</span>
          </PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="toggleSelectPanel(); viewMenuVisible = false">
            <i-icon-park-outline:move-one class="icon" /> {{ t('toolbar.objectList') }}
            <span class="sub-check" v-if="showSelectPanel">✓</span>
          </PopoverMenuItem>
          <PopoverMenuItem class="popover-menu-item" @click="toggleNotesPanel(); viewMenuVisible = false">
            <i-icon-park-outline:comment class="icon" /> {{ t('toolbar.commentsPane') }}
            <span class="sub-check" v-if="showNotesPanel">✓</span>
          </PopoverMenuItem>

          <Divider :margin="6" />

          <PopoverMenuItem class="popover-menu-item" @click="toggleSearchPanel(); viewMenuVisible = false">
            <i-icon-park-outline:search class="icon" /> {{ t('toolbar.findReplace') }}
          </PopoverMenuItem>
        </template>
        <div class="keynote-pill-btn icon-only" :class="{ active: editorViewMode !== 'navigator' || showPresenterNotes || showSelectPanel || showRuler }" :title="t('toolbar.viewOptions')">
          <i-icon-park-outline:layout-two class="main-icon" />
          <i-icon-park-outline:down class="mini-caret" />
        </div>
      </Popover>

      <!-- Zoom Capsule -->
      <Popover trigger="click" v-model:value="canvasScaleVisible" placement="bottom" :offset="8">
        <template #content>
          <PopoverMenuItem
            center
            v-for="item in canvasScalePresetList"
            :key="item"
            @click="applyCanvasPresetScale(item)"
          >{{ item }}%</PopoverMenuItem>
          <PopoverMenuItem center @click="resetCanvas(); canvasScaleVisible = false">{{ t('toolbar.fitSlide') }}</PopoverMenuItem>
        </template>
        <div class="keynote-pill-btn zoom-pill" :title="t('toolbar.zoomLevel')">
          <span class="zoom-value">{{ canvasScalePercentage }}</span>
          <i-icon-park-outline:down class="mini-caret" />
        </div>
      </Popover>

      <div class="pill-divider"></div>

      <!-- Play Floating Capsule -->
      <div class="keynote-pill-capsule play-capsule">
        <div class="capsule-item play-main" @click="enterScreening()" :title="t('toolbar.playSlideshow')">
          <i-icon-park-outline:play-one class="play-icon" />
        </div>
        <Popover trigger="click" v-model:value="playMenuVisible" placement="bottom" :offset="8">
          <template #content>
            <PopoverMenuItem class="popover-menu-item" @click="enterScreeningFromStart(); playMenuVisible = false">
              <i-icon-park-outline:slide-two class="icon" /> {{ t('toolbar.playFromBeginning') }}
            </PopoverMenuItem>
            <PopoverMenuItem class="popover-menu-item" @click="enterScreening(); playMenuVisible = false">
              <i-icon-park-outline:ppt class="icon" /> {{ t('toolbar.playFromCurrent') }}
            </PopoverMenuItem>
          </template>
          <div class="capsule-caret" :title="t('toolbar.playbackOptions')"><i-icon-park-outline:down /></div>
        </Popover>
      </div>

      <!-- Add Slide Floating Capsule -->
      <div class="keynote-pill-capsule add-slide-capsule">
        <div class="capsule-item" @click="createSlide()" :title="t('toolbar.addSlide')">
          <i-icon-park-outline:plus class="main-icon" />
        </div>
        <Popover trigger="click" v-model:value="templateMenuVisible" placement="bottom-start" :offset="8">
          <template #content>
            <PopoverMenuItem class="popover-menu-item" @click="openThemeChooser(); templateMenuVisible = false">
              <i-icon-park-outline:theme class="icon" /> {{ t('toolbar.chooseTheme') }}
            </PopoverMenuItem>
            <PopoverMenuItem class="popover-menu-item" @click="createSlide(); templateMenuVisible = false">
              <i-icon-park-outline:plus class="icon" /> {{ t('toolbar.addSlide') }}
            </PopoverMenuItem>
            <Templates
              @select="slide => { createSlideByTemplate(slide); templateMenuVisible = false }"
              @selectAll="({ slides, theme }) => { insertAllTemplates({ slides, theme }); templateMenuVisible = false }"
            />
          </template>
          <div class="capsule-caret" :title="t('toolbar.addSlide')"><i-icon-park-outline:down /></div>
        </Popover>
      </div>

      <!-- AI Assistant Capsule (Apple Intelligence violet/sparkle style) -->
      <div 
        class="keynote-pill-btn ai-capsule-btn" 
        @click="openAIPPTDialog()" 
        :title="t('toolbar.aiStudio')"
      >
        <svg class="sparkle-icon" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#sparkle-grad)" />
          <defs>
            <linearGradient id="sparkle-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stop-color="#af52de" />
              <stop offset="1" stop-color="#5856d6" />
            </linearGradient>
          </defs>
        </svg>
        <span class="ai-label">{{ t('toolbar.aiStudio') }}</span>
      </div>

      <div class="pill-divider"></div>

      <!-- Undo / Redo Capsule -->
      <div class="keynote-pill-capsule undo-capsule">
        <div class="capsule-item" :class="{ disable: !canUndo }" @click="undo()" :title="t('toolbar.undo')">
          <i-icon-park-outline:back class="main-icon" />
        </div>
        <div class="capsule-item" :class="{ disable: !canRedo }" @click="redo()" :title="t('toolbar.redo')">
          <i-icon-park-outline:next class="main-icon" />
        </div>
      </div>
    </div>

    <!-- Center Cluster: Unified Apple Insert Capsule (Table | Chart | Text | Shape | Line | Media) -->
    <div class="toolbar-cluster center-cluster">
      <div class="keynote-insert-capsule">
        <!-- Table -->
        <Popover trigger="click" v-model:value="tableGeneratorVisible" :offset="8">
          <template #content>
            <TableGenerator
              @close="tableGeneratorVisible = false"
              @insert="({ row, col }) => { createTableElement(row, col); tableGeneratorVisible = false }"
            />
          </template>
          <div class="insert-item" v-tooltip="'Insert Table'">
            <i-icon-park-outline:insert-table class="main-icon" />
          </div>
        </Popover>

        <div class="insert-sep"></div>

        <!-- Chart (Image 1 popover) -->
        <Popover trigger="click" v-model:value="chartPoolVisible" :offset="8">
          <template #content>
            <ChartPool @select="payload => { createChartElement(payload.type, payload.themeColors); chartPoolVisible = false }" />
          </template>
          <div class="insert-item" v-tooltip="'Insert Chart'">
            <i-icon-park-outline:chart-histogram class="main-icon" />
          </div>
        </Popover>

        <div class="insert-sep"></div>

        <!-- Text -->
        <div class="insert-item-split" :class="{ active: creatingElement?.type === 'text' }">
          <div class="split-left" @click="drawText()" v-tooltip="'Insert Text Box'">
            <i-icon-park-outline:text class="main-icon" />
          </div>
          <Popover trigger="click" v-model:value="textTypeSelectVisible" :offset="8">
            <template #content>
              <PopoverMenuItem center @click="() => { drawText(); textTypeSelectVisible = false }">
                <i-icon-park-outline:text-rotation-none class="icon" /> Horizontal Text Box
              </PopoverMenuItem>
              <PopoverMenuItem center @click="() => { drawText(true); textTypeSelectVisible = false }">
                <i-icon-park-outline:text-rotation-down class="icon" /> Vertical Text Box
              </PopoverMenuItem>
            </template>
            <div class="split-right" v-tooltip="'Text Orientation'"><i-icon-park-outline:down /></div>
          </Popover>
        </div>

        <div class="insert-sep"></div>

        <!-- Shape -->
        <div class="insert-item-split" :class="{ active: creatingCustomShape || creatingElement?.type === 'shape' }">
          <Popover trigger="click" v-model:value="shapePoolVisible" :offset="8">
            <template #content>
              <ShapePool
                @select="shape => drawShape(shape)"
                @drawPen="() => { svgPathEditorVisible = true; shapePoolVisible = false }"
              />
            </template>
            <div class="split-left" v-tooltip="'Insert Shape'">
              <i-icon-park-outline:graphic-design class="main-icon" />
            </div>
          </Popover>
          <Popover trigger="click" v-model:value="shapeMenuVisible" :offset="8">
            <template #content>
              <PopoverMenuItem center @click="shapeMenuVisible = false; shapePoolVisible = true">
                <i-icon-park-outline:graphic-design class="icon" /> Shape Library
              </PopoverMenuItem>
              <PopoverMenuItem center @click="() => { svgPathEditorVisible = true; shapeMenuVisible = false }">
                <i-icon-park-outline:connection class="icon" /> Draw with Pen (Bezier)
              </PopoverMenuItem>
              <PopoverMenuItem center @click="() => { drawCustomShape(); shapeMenuVisible = false }">
                <i-icon-park-outline:writing-fluently class="icon" /> Freeform Polygon
              </PopoverMenuItem>
            </template>
            <div class="split-right" v-tooltip="'Shape Options'"><i-icon-park-outline:down /></div>
          </Popover>
        </div>

        <div class="insert-sep"></div>

        <!-- Line -->
        <Popover trigger="click" v-model:value="linePoolVisible" :offset="8">
          <template #content>
            <LinePool @select="line => drawLine(line)" />
          </template>
          <div class="insert-item" :class="{ active: creatingElement?.type === 'line' }" v-tooltip="'Insert Line'">
            <i-icon-park-outline:connection class="main-icon" />
          </div>
        </Popover>

        <div class="insert-sep"></div>

        <!-- Media -->
        <Popover trigger="click" v-model:value="mediaMenuVisible" :offset="8">
          <template #content>
            <FileInput @change="files => { insertImageElement(files); mediaMenuVisible = false }">
              <PopoverMenuItem class="popover-menu-item"><i-icon-park-outline:picture class="icon" /> Choose Photo / Image...</PopoverMenuItem>
            </FileInput>
            <PopoverMenuItem class="popover-menu-item" @click="openImageLibPanel(); mediaMenuVisible = false">
              <i-icon-park-outline:pic class="icon" /> Photo Gallery Library
            </PopoverMenuItem>
            <PopoverMenuItem class="popover-menu-item" @click="mediaMenuVisible = false; mediaInputVisible = true">
              <i-icon-park-outline:video-two class="icon" /> Web Video or Audio...
            </PopoverMenuItem>
            <PopoverMenuItem class="popover-menu-item" @click="mediaMenuVisible = false; latexEditorVisible = true">
              <i-icon-park-outline:formula class="icon" /> Equation (LaTeX)...
            </PopoverMenuItem>
            <PopoverMenuItem class="popover-menu-item" @click="toggleSymbolPanel(); mediaMenuVisible = false">
              <i-icon-park-outline:symbol class="icon" /> Symbols &amp; Emoji
            </PopoverMenuItem>
          </template>
          <div class="insert-item" v-tooltip="'Insert Media (Photos, Video, Equations)'">
            <i-icon-park-outline:picture-album class="main-icon" />
          </div>
        </Popover>
      </div>

      <!-- Slide Comments Pill -->
      <div 
        class="keynote-pill-btn icon-only comment-pill" 
        :class="{ active: showNotesPanel }" 
        @click="toggleNotesPanel()" 
        v-tooltip="'Slide Comments & Notes'"
      >
        <i-icon-park-outline:comment class="main-icon" />
      </div>
    </div>

    <!-- Right Cluster: Format / Animate / Document Capsule (Keynote Parity) -->
    <div class="toolbar-cluster right-cluster">
      <!-- Inspector Mode Segmented Capsule (Image 4: [ 🖌 | ◇ | ▭ ]) -->
      <div class="keynote-inspector-capsule">
        <div
          class="inspector-item"
          :class="{ active: activeInspectorGroup === 'format' }"
          @click="switchInspectorGroup('format')"
          :title="t('toolbar.formatInspector')"
        >
          <i-icon-park-outline:platte class="main-icon" />
        </div>

        <div
          class="inspector-item"
          :class="{ active: activeInspectorGroup === 'animate' }"
          @click="switchInspectorGroup('animate')"
          :title="t('toolbar.animateInspector')"
        >
          <i-icon-park-outline:effects class="main-icon" />
        </div>

        <div
          class="inspector-item"
          :class="{ active: activeInspectorGroup === 'document' }"
          @click="switchInspectorGroup('document')"
          :title="t('toolbar.documentInspector')"
        >
          <i-icon-park-outline:doc-detail class="main-icon" />
        </div>
      </div>
    </div>

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
  </FloatingRail>
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

const applyCanvasPresetScale = (value: number) => {
  setCanvasScalePercentage(value)
  canvasScaleVisible.value = false
}

const insertAllTemplates = ({ slides, theme }: { slides: Slide[], theme: Partial<SlideTheme> }) => {
  if (isEmptySlide.value) slidesStore.setSlides(slides, theme)
  else addSlidesFromData(slides)
}

const activeInspectorGroup = computed<'format' | 'animate' | 'document'>(() => {
  return mainStore.inspectorMode
})

const switchInspectorGroup = (group: 'format' | 'animate' | 'document') => {
  mainStore.setInspectorMode(group)
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
.canvas-tool {
  position: relative;
  height: 46px;
  border: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  color: var(--text-primary, #1d1d1f);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 14px;
  user-select: none;
  z-index: 10;
  margin: 3px 10px;
  width: calc(100% - 20px);
  height: 40px;
  border-radius: 14px;
}

.toolbar-cluster {
  display: flex;
  align-items: center;
  gap: 6px;

  &.center-cluster {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    gap: 8px;
  }

  &.right-cluster {
    gap: 8px;
  }
}

.pill-divider {
  width: 1px;
  height: 18px;
  background-color: var(--border-divider, rgba(0, 0, 0, 0.1));
  margin: 0 2px;
}

/* Base floating pill button */
.keynote-pill-btn {
  height: 32px;
  padding: 0 10px;
  border-radius: 9999px;
  background: var(--bg-pill, rgba(255, 255, 255, 0.85));
  border: 1px solid var(--border-pill, rgba(0, 0, 0, 0.08));
  box-shadow: var(--shadow-pill, 0 1px 3px rgba(0, 0, 0, 0.05));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-primary, #1d1d1f);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--bg-pill-hover, #ffffff);
    transform: translateY(-0.5px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }

  &.active {
    background: var(--accent-color, #007aff);
    color: #ffffff;
    border-color: var(--accent-color, #007aff);

    .main-icon, .mini-caret {
      color: #ffffff;
    }
  }

  &.icon-only {
    padding: 0 8px;
    min-width: 34px;
  }

  .main-icon {
    font-size: 15px;
    color: var(--text-primary, #1d1d1f);
  }

  .mini-caret {
    font-size: 9px;
    color: var(--text-tertiary, #86868b);
  }

  &.zoom-pill {
    padding: 0 9px;
    font-size: 11.5px;
    font-weight: 500;
  }
}

/* Keynote capsule with sub-buttons (e.g. Play, Add Slide, Undo/Redo) */
.keynote-pill-capsule {
  height: 32px;
  border-radius: 9999px;
  background: var(--bg-pill, rgba(255, 255, 255, 0.85));
  border: 1px solid var(--border-pill, rgba(0, 0, 0, 0.08));
  box-shadow: var(--shadow-pill, 0 1px 3px rgba(0, 0, 0, 0.05));
  display: inline-flex;
  align-items: center;
  padding: 2px;
  transition: all 0.15s ease;

  .capsule-item {
    height: 28px;
    min-width: 28px;
    padding: 0 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    color: var(--text-primary, #1d1d1f);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(.disable) {
      background: var(--bg-control-active, rgba(0, 0, 0, 0.06));
    }

    &.disable {
      opacity: 0.35;
      cursor: default;
    }

    .main-icon {
      font-size: 14px;
    }
  }

  .capsule-caret {
    height: 28px;
    width: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    font-size: 9px;
    color: var(--text-tertiary, #86868b);
    cursor: pointer;
    margin-right: 2px;

    &:hover {
      background: var(--bg-control-active, rgba(0, 0, 0, 0.06));
      color: var(--text-primary, #1d1d1f);
    }
  }

  &.play-capsule {
    .play-icon {
      font-size: 15px;
      color: var(--accent-color, #007aff);
    }
    &:hover .play-icon {
      color: var(--accent-color, #007aff);
    }
  }
}

/* AI Studio Button (Apple Intelligence Purple Frosted Style) */
.ai-capsule-btn {
  background: rgba(175, 82, 222, 0.1);
  border-color: rgba(175, 82, 222, 0.25);
  color: #af52de;
  font-weight: 500;
  font-size: 11.5px;
  gap: 5px;
  padding: 0 11px;

  .sparkle-icon {
    width: 14px;
    height: 14px;
  }

  .ai-label {
    background: linear-gradient(135deg, #af52de 0%, #5856d6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 600;
    letter-spacing: -0.1px;
  }

  &:hover {
    background: rgba(175, 82, 222, 0.16);
    border-color: rgba(175, 82, 222, 0.4);
    box-shadow: 0 2px 8px rgba(175, 82, 222, 0.25);
  }
}

/* Master Insert Capsule (Center of Toolbar) */
.keynote-insert-capsule {
  height: 34px;
  border-radius: 9999px;
  background: var(--bg-pill, rgba(255, 255, 255, 0.85));
  border: 1px solid var(--border-pill, rgba(0, 0, 0, 0.08));
  box-shadow: var(--shadow-pill, 0 1px 4px rgba(0, 0, 0, 0.06));
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;

  .insert-item {
    height: 30px;
    min-width: 32px;
    padding: 0 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    color: var(--text-primary, #1d1d1f);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--bg-control-active, rgba(0, 0, 0, 0.06));
      color: var(--accent-color, #007aff);
    }

    &.active {
      background: var(--accent-color, #007aff);
      color: #ffffff;
      .main-icon {
        color: #ffffff;
      }
    }

    .main-icon {
      font-size: 15px;
    }
  }

  .insert-item-split {
    height: 30px;
    display: inline-flex;
    align-items: center;
    border-radius: 9999px;
    transition: all 0.15s ease;

    &.active {
      background: var(--accent-color, #007aff);
      color: #ffffff;
      .main-icon, .split-right {
        color: #ffffff;
      }
    }

    .split-left {
      height: 30px;
      padding: 0 5px 0 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-top-left-radius: 9999px;
      border-bottom-left-radius: 9999px;

      &:hover {
        background: var(--bg-control-active, rgba(0, 0, 0, 0.06));
        color: var(--accent-color, #007aff);
      }

      .main-icon {
        font-size: 15px;
      }
    }

    .split-right {
      height: 30px;
      padding: 0 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: var(--text-tertiary, #86868b);
      cursor: pointer;
      border-top-right-radius: 9999px;
      border-bottom-right-radius: 9999px;

      &:hover {
        background: var(--bg-control-active, rgba(0, 0, 0, 0.08));
        color: var(--text-primary, #1d1d1f);
      }
    }
  }

  .insert-sep {
    width: 1px;
    height: 14px;
    background: var(--border-divider, rgba(0, 0, 0, 0.08));
    margin: 0 2px;
  }
}

/* Inspector Mode Capsule (Image 4: [ 🖌 | ◇ | ▭ ]) */
.keynote-inspector-capsule {
  height: 32px;
  border-radius: 9999px;
  background: var(--bg-pill, rgba(255, 255, 255, 0.85));
  border: 1px solid var(--border-pill, rgba(0, 0, 0, 0.08));
  box-shadow: var(--shadow-pill, 0 1px 3px rgba(0, 0, 0, 0.05));
  display: inline-flex;
  align-items: center;
  padding: 2px;
  gap: 1px;

  .inspector-item {
    height: 28px;
    min-width: 32px;
    padding: 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    color: var(--text-secondary, #515154);
    cursor: pointer;
    transition: all 0.15s ease;

    .main-icon {
      font-size: 14px;
    }

    &:hover:not(.active) {
      background: var(--bg-control-active, rgba(0, 0, 0, 0.05));
      color: var(--text-primary, #1d1d1f);
    }

    &.active {
      background: var(--accent-color, #007aff);
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 122, 255, 0.35);

      .main-icon {
        color: #ffffff;
      }
    }
  }
}

.popover-menu-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;

  &.center {
    justify-content: center;
  }

  .icon {
    font-size: 15px;
    margin-right: 8px;
  }

  .sub-check {
    margin-left: auto;
    font-size: 11px;
    font-weight: 700;
    color: var(--accent-color, #007aff);
  }
}

.view-menu-section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary, #86868b);
  padding: 4px 10px 2px;
}

@media screen and (max-width: 1200px) {
  .toolbar-cluster.center-cluster {
    position: static;
    transform: none;
    margin: 0 auto;
  }
  .canvas-tool {
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
    gap: 8px;
  }
  .toolbar-cluster { scroll-snap-align: center; flex: 0 0 auto; }
}

@media screen and (max-width: 768px) {
  .canvas-tool {
    margin: 3px 6px;
    width: calc(100% - 12px);
    padding: 3px 5px;
    height: 44px;
  }
  .left-cluster .zoom-pill,
  .left-cluster .undo-capsule,
  .left-cluster .ai-capsule-btn span {
    display: none;
  }
}

/* Flat hierarchy: one glass rail, borderless inner controls. */
.canvas-tool {
  .keynote-pill-btn,
  .keynote-pill-capsule,
  .keynote-insert-capsule,
  .keynote-inspector-capsule {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    border-radius: 10px;
  }

  .keynote-pill-btn:hover,
  .keynote-pill-capsule:hover,
  .keynote-insert-capsule:hover,
  .keynote-inspector-capsule:hover {
    background: var(--bg-control, rgba(0, 0, 0, 0.04));
    box-shadow: none;
    transform: none;
  }

  .capsule-item,
  .capsule-caret,
  .insert-item,
  .insert-item-split,
  .insert-item-split .split-left,
  .insert-item-split .split-right,
  .inspector-item {
    border-radius: 8px;
  }

  .ai-capsule-btn {
    background: rgba(175, 82, 222, 0.09);
  }

  .pill-divider,
  .insert-sep {
    opacity: .65;
  }
}
</style>
