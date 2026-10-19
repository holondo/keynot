<template>
  <div class="keynote-table-tab" v-if="handleTableElement">
    <!-- Table Styles Section (Screenshot 4: 2x3 swatch grid with pagination) -->
    <div class="section-title">Table Styles</div>
    <div class="table-styles-grid">
      <div 
        class="style-preset-card"
        v-for="(preset, idx) in currentPresetsPage"
        :key="idx"
        :class="{ active: currentThemeColor === preset.headerBg }"
        @click="applyTableTheme(preset)"
      >
        <div class="mini-table">
          <div class="mini-row header" :style="{ backgroundColor: preset.headerBg }">
            <span class="mini-cell"></span>
            <span class="mini-cell"></span>
            <span class="mini-cell"></span>
          </div>
          <div class="mini-row alt" :style="{ backgroundColor: preset.altBg }">
            <span class="mini-cell"></span>
            <span class="mini-cell"></span>
            <span class="mini-cell"></span>
          </div>
          <div class="mini-row">
            <span class="mini-cell"></span>
            <span class="mini-cell"></span>
            <span class="mini-cell"></span>
          </div>
        </div>
      </div>
    </div>
    <div class="pagination-dots">
      <span class="dot active"></span>
      <span class="dot"></span>
    </div>

    <Divider :margin="10" />

    <!-- Table Options (Screenshot 4: Title, Caption checkboxes) -->
    <div class="section-title">Table Options</div>
    <div class="control-row checkboxes-row">
      <Checkbox :value="showTitle" @update:value="v => toggleTableTitle(v)">Title</Checkbox>
      <Checkbox :value="showCaption" @update:value="v => toggleTableCaption(v)">Caption</Checkbox>
    </div>

    <!-- Headers & Footer Steppers (Screenshot 4) -->
    <div class="control-row label-value-row">
      <span class="row-label">Headers &amp; Footer</span>
      <div class="headers-footer-steppers">
        <div class="hf-item" v-tooltip="'Header Row'">
          <i-icon-park-outline:insert-table />
          <NumberInput
            style="width: 44px;"
            :min="0"
            :max="5"
            :value="headerRowsCount"
            @update:value="val => setHeaderRows(val)"
          />
        </div>
        <div class="hf-item" v-tooltip="'Header Column'">
          <i-icon-park-outline:table-report />
          <NumberInput
            style="width: 44px;"
            :min="0"
            :max="5"
            :value="headerColsCount"
            @update:value="val => setHeaderCols(val)"
          />
        </div>
        <div class="hf-item" v-tooltip="'Footer Row'">
          <i-icon-park-outline:align-bottom />
          <NumberInput
            style="width: 44px;"
            :min="0"
            :max="5"
            :value="footerRowsCount"
            @update:value="val => setFooterRows(val)"
          />
        </div>
      </div>
    </div>

    <!-- Rows and Columns Steppers -->
    <div class="control-row label-value-row">
      <span class="row-label">Rows</span>
      <NumberInput
        style="width: 90px;"
        :min="1"
        :max="30"
        :value="rowCount"
        @update:value="val => setRowCount(val)"
      />
    </div>

    <div class="control-row label-value-row">
      <span class="row-label">Columns</span>
      <NumberInput
        style="width: 90px;"
        :min="1"
        :max="15"
        :value="colCount"
        @update:value="val => setColCount(val)"
      />
    </div>

    <!-- Table Font Size (A A buttons) -->
    <div class="control-row label-value-row">
      <span class="row-label">Table Font Size</span>
      <div class="font-size-adjust-group">
        <Button class="size-btn" @click="adjustTableFontSize(-1)">A</Button>
        <Button class="size-btn large" @click="adjustTableFontSize(1)">A</Button>
      </div>
    </div>

    <Divider :margin="10" />

    <!-- Table Outline (Border, Color Well, Width pt) -->
    <div class="section-title">Table Outline</div>
    <div class="control-row outline-row">
      <div class="outline-line-sample">
        <div class="sample-stroke" :style="{ borderTop: `${outlineWidth}px solid ${outlineColor}` }"></div>
      </div>
      <Popover trigger="click" style="width: 75px;">
        <template #content>
          <ColorPicker
            :modelValue="outlineColor"
            @update:modelValue="val => updateOutlineColor(val)"
          />
        </template>
        <ColorButton :color="outlineColor" />
      </Popover>
      <NumberInput
        style="width: 72px;"
        :min="0"
        :max="20"
        :step="1"
        :value="outlineWidth"
        @update:value="val => updateOutlineWidth(val)"
      >
        <template #suffix>pt</template>
      </NumberInput>
    </div>

    <!-- Gridlines Icons -->
    <div class="control-row label-value-row" style="margin-top: 10px;">
      <span class="row-label">Gridlines</span>
      <div class="gridlines-group">
        <button class="grid-btn" :class="{ active: gridlinesType === 'all' }" @click="setGridlines('all')" v-tooltip="'All Gridlines'">
          <i-icon-park-outline:all-application />
        </button>
        <button class="grid-btn" :class="{ active: gridlinesType === 'horizontal' }" @click="setGridlines('horizontal')" v-tooltip="'Horizontal Gridlines'">
          <i-icon-park-outline:hamburger-button />
        </button>
        <button class="grid-btn" :class="{ active: gridlinesType === 'vertical' }" @click="setGridlines('vertical')" v-tooltip="'Vertical Gridlines'">
          <i-icon-park-outline:more-three />
        </button>
        <button class="grid-btn" :class="{ active: gridlinesType === 'outer' }" @click="setGridlines('outer')" v-tooltip="'Outer Borders'">
          <i-icon-park-outline:square />
        </button>
        <button class="grid-btn" :class="{ active: gridlinesType === 'none' }" @click="setGridlines('none')" v-tooltip="'No Gridlines'">
          <i-icon-park-outline:close-small />
        </button>
      </div>
    </div>

    <!-- Alternating Row Color Switch (Screenshot 4) -->
    <div class="control-row label-value-row" style="margin-top: 10px;">
      <span class="row-label">Alternating Row Color</span>
      <Switch :value="alternatingRowColor" @update:value="val => toggleAlternatingRows(val)" />
    </div>

    <Divider :margin="10" />

    <!-- Row & Column Size (Screenshot 4: Height pt + Fit, Width pt + Fit) -->
    <div class="section-title">Row &amp; Column Size</div>
    <div class="control-row label-value-row">
      <span class="row-label">Height</span>
      <div class="size-fit-row">
        <NumberInput
          style="width: 90px;"
          :min="20"
          :max="500"
          :step="5"
          :value="Math.round(handleTableElement.height / rowCount)"
          @update:value="val => updateRowHeight(val)"
        >
          <template #suffix>pt</template>
        </NumberInput>
        <Button class="fit-btn" @click="fitRowHeight()">Fit</Button>
      </div>
    </div>

    <div class="control-row label-value-row">
      <span class="row-label">Width</span>
      <div class="size-fit-row">
        <NumberInput
          style="width: 90px;"
          :min="40"
          :max="1000"
          :step="10"
          :value="Math.round(handleTableElement.width)"
          @update:value="val => updateTableWidth(val)"
        >
          <template #suffix>pt</template>
        </NumberInput>
        <Button class="fit-btn" @click="fitTableWidth()">Fit</Button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, type Ref, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { PPTTableElement, TableTheme } from '@/types/slides'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import emitter, { EmitterEvents } from '@/utils/emitter'
import message from '@/utils/message'

import Button from '@/components/Button.vue'
import NumberInput from '@/components/NumberInput.vue'
import Checkbox from '@/components/Checkbox.vue'
import Switch from '@/components/Switch.vue'
import Divider from '@/components/Divider.vue'
import Popover from '@/components/Popover.vue'
import ColorButton from '@/components/ColorButton.vue'
import ColorPicker from '@/components/ColorPicker/index.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { handleElement, handleElementId } = storeToRefs(mainStore)

const handleTableElement = handleElement as Ref<PPTTableElement>

const showTitle = ref(false)
const showCaption = ref(false)
const gridlinesType = ref('all')

const { addHistorySnapshot } = useHistorySnapshot()

const tableThemePresets = [
  { headerBg: '#007aff', altBg: '#f2f8ff', borderColor: '#d0e3ff' },
  { headerBg: '#34c759', altBg: '#f2faf4', borderColor: '#d2f0db' },
  { headerBg: '#ff9500', altBg: '#fffaf2', borderColor: '#ffe5cc' },
  { headerBg: '#5856d6', altBg: '#f5f5fc', borderColor: '#dcdcf7' },
  { headerBg: '#ff2d55', altBg: '#fff2f4', borderColor: '#ffd1d9' },
  { headerBg: '#1c1c1e', altBg: '#f2f2f7', borderColor: '#d1d1d6' },
]

const currentPresetsPage = computed(() => tableThemePresets)

const currentThemeColor = computed(() => handleTableElement.value?.theme?.color || '#007aff')

const rowCount = computed(() => handleTableElement.value?.data.length || 5)
const colCount = computed(() => handleTableElement.value?.data[0]?.length || 4)

const headerRowsCount = computed(() => handleTableElement.value?.theme?.rowHeader ? 1 : 0)
const headerColsCount = computed(() => handleTableElement.value?.theme?.colHeader ? 1 : 0)
const footerRowsCount = computed(() => handleTableElement.value?.theme?.rowFooter ? 1 : 0)
const alternatingRowColor = computed(() => !!handleTableElement.value?.theme)

const outlineWidth = computed(() => handleTableElement.value?.outline?.width || 1)
const outlineColor = computed(() => handleTableElement.value?.outline?.color || '#d1d1d6')

const emitTableCommand = (command: 'insert-row' | 'insert-col' | 'delete-row' | 'delete-col', position?: 'before' | 'after') => {
  emitter.emit(EmitterEvents.TABLE_COMMAND, { targetId: handleElementId.value, command, position })
}

const updateTable = (props: Partial<PPTTableElement>) => {
  if (!handleElementId.value) return
  slidesStore.updateElement({ id: handleElementId.value, props })
  addHistorySnapshot()
}

const applyTableTheme = (preset: typeof tableThemePresets[0]) => {
  const newTheme: TableTheme = {
    color: preset.headerBg,
    rowHeader: true,
    rowFooter: false,
    colHeader: false,
    colFooter: false,
  }
  updateTable({
    theme: newTheme,
    outline: {
      color: preset.borderColor,
      width: 1,
      style: 'solid',
    }
  })
}

const defaultTheme: TableTheme = {
  color: '#007aff',
  rowHeader: true,
  rowFooter: false,
  colHeader: false,
  colFooter: false,
}

const setHeaderRows = (val: number) => {
  const currentTheme = handleTableElement.value.theme || defaultTheme
  updateTable({
    theme: {
      ...defaultTheme,
      ...currentTheme,
      rowHeader: val > 0,
    }
  })
}

const setHeaderCols = (val: number) => {
  const currentTheme = handleTableElement.value.theme || defaultTheme
  updateTable({
    theme: {
      ...defaultTheme,
      ...currentTheme,
      colHeader: val > 0,
    }
  })
}

const setFooterRows = (val: number) => {
  const currentTheme = handleTableElement.value.theme || defaultTheme
  updateTable({
    theme: {
      ...defaultTheme,
      ...currentTheme,
      rowFooter: val > 0,
    }
  })
}

const setRowCount = (newRows: number) => {
  const current = rowCount.value
  if (newRows > current) {
    for (let i = 0; i < newRows - current; i++) emitTableCommand('insert-row', 'after')
  } else if (newRows < current && current > 1) {
    for (let i = 0; i < current - newRows; i++) emitTableCommand('delete-row')
  }
}

const setColCount = (newCols: number) => {
  const current = colCount.value
  if (newCols > current) {
    for (let i = 0; i < newCols - current; i++) emitTableCommand('insert-col', 'after')
  } else if (newCols < current && current > 1) {
    for (let i = 0; i < current - newCols; i++) emitTableCommand('delete-col')
  }
}

const adjustTableFontSize = (delta: number) => {
  const currentFontSize = 14
  const newSize = Math.max(9, Math.min(48, currentFontSize + delta))
  message.success(`Set table font size to ${newSize}pt`)
}

const updateOutlineColor = (color: string) => {
  const outline = { ...(handleTableElement.value.outline || { width: 1, style: 'solid' }), color }
  updateTable({ outline })
}

const updateOutlineWidth = (width: number) => {
  const outline = { ...(handleTableElement.value.outline || { color: '#d1d1d6', style: 'solid' }), width }
  updateTable({ outline })
}

const setGridlines = (type: string) => {
  gridlinesType.value = type
  if (type === 'none') {
    updateTable({ outline: { width: 0, style: 'solid', color: 'transparent' } })
  } else {
    updateTable({ outline: { width: 1, style: 'solid', color: '#d1d1d6' } })
  }
}

const toggleAlternatingRows = (val: boolean) => {
  if (val) {
    applyTableTheme(tableThemePresets[0])
  } else {
    updateTable({ theme: undefined })
  }
}

const updateRowHeight = (height: number) => {
  const total = height * rowCount.value
  updateTable({ height: total })
}

const updateTableWidth = (width: number) => {
  updateTable({ width })
}

const fitRowHeight = () => {
  updateTable({ height: rowCount.value * 32 })
  message.success('Fit row heights to table content')
}

const fitTableWidth = () => {
  updateTable({ width: colCount.value * 120 })
  message.success('Fit column widths to slide stage')
}

const toggleTableTitle = (v: boolean) => {
  showTitle.value = v
}

const toggleTableCaption = (v: boolean) => {
  showCaption.value = v
}
</script>

<style lang="scss" scoped>
.keynote-table-tab {
  user-select: none;
  font-size: 12.5px;
  color: var(--text-primary, #1d1d1f);
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary, #86868b);
  margin-bottom: 8px;
}

.table-styles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  .style-preset-card {
    height: 48px;
    border-radius: 6px;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
    background: var(--bg-card, #ffffff);
    padding: 3px;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

    &:hover {
      border-color: var(--accent-color, #007aff);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    &.active {
      border-color: var(--accent-color, #007aff);
      box-shadow: 0 0 0 1.5px var(--accent-color, #007aff);
    }

    .mini-table {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      border-radius: 4px;
      overflow: hidden;

      .mini-row {
        flex: 1;
        display: flex;
        border-bottom: 0.5px solid var(--border-divider, rgba(0, 0, 0, 0.05));

        .mini-cell {
          flex: 1;
          border-right: 0.5px solid var(--border-divider, rgba(0, 0, 0, 0.05));
        }

        &.header {
          opacity: 0.9;
        }
      }
    }
  }
}

.pagination-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin-top: 8px;

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--border-divider, #d1d1d6);

    &.active {
      background: var(--accent-color, #86868b);
    }
  }
}

.control-row {
  margin-bottom: 8px;

  &.checkboxes-row {
    display: flex;
    gap: 16px;
  }

  &.label-value-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 30px;

    .row-label {
      font-size: 12px;
      color: var(--text-primary, #1d1d1f);
      font-weight: 500;
    }
  }
}

.headers-footer-steppers {
  display: flex;
  align-items: center;
  gap: 8px;

  .hf-item {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 13px;
    color: var(--text-secondary, #6e6e73);
  }
}

.font-size-adjust-group {
  display: flex;
  gap: 4px;

  .size-btn {
    width: 32px;
    height: 26px;
    font-weight: 600;
    font-size: 11px;
    padding: 0;

    &.large {
      font-size: 15px;
    }
  }
}

.outline-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .outline-line-sample {
    flex: 1;
    height: 26px;
    display: flex;
    align-items: center;

    .sample-stroke {
      width: 100%;
    }
  }
}

.gridlines-group {
  display: flex;
  align-items: center;
  background-color: var(--bg-control, #e9e9eb);
  padding: 2px;
  border-radius: 7px;
  gap: 1px;

  .grid-btn {
    width: 24px;
    height: 24px;
    border: 0;
    background: transparent;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary, #1d1d1f);
    font-size: 12px;
    cursor: pointer;

    &:hover:not(.active) {
      background-color: var(--bg-hover, rgba(0, 0, 0, 0.05));
    }

    &.active {
      background-color: var(--accent-color, #007aff);
      color: #ffffff;
    }
  }
}

.size-fit-row {
  display: flex;
  align-items: center;
  gap: 6px;

  .fit-btn {
    height: 26px;
    padding: 0 10px;
    font-size: 11.5px;
  }
}
</style>
