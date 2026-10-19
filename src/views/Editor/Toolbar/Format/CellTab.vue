<template>
  <div class="cell-tab" v-if="currentTable">
    <!-- Fill -->
    <div class="section-title">Cell Fill</div>
    <div class="row">
      <div class="label">Fill Color:</div>
      <Popover trigger="click" style="flex: 1;">
        <template #content>
          <ColorPicker
            :modelValue="cellFill"
            @update:modelValue="color => updateCellFill(color)"
          />
        </template>
        <ColorButton :color="cellFill || '#ffffff'" />
      </Popover>
    </div>

    <Divider />

    <!-- Text Alignment in Cell -->
    <div class="section-title">Cell Alignment</div>
    <div class="row">
      <RadioGroup 
        class="radio-cluster"
        button-style="solid" 
        :value="textAttrs.align"
        @update:value="val => updateTextAttrs({ align: val as TextAlign })"
        style="width: 100%;"
      >
        <RadioButton value="left" v-tooltip="'Align Left'" style="flex: 1;"><i-icon-park-outline:align-text-left /></RadioButton>
        <RadioButton value="center" v-tooltip="'Center'" style="flex: 1;"><i-icon-park-outline:align-text-center /></RadioButton>
        <RadioButton value="right" v-tooltip="'Align Right'" style="flex: 1;"><i-icon-park-outline:align-text-right /></RadioButton>
        <RadioButton value="justify" v-tooltip="'Justify'" style="flex: 1;"><i-icon-park-outline:align-text-both /></RadioButton>
      </RadioGroup>
    </div>

    <div class="row">
      <RadioGroup 
        class="radio-cluster"
        button-style="solid" 
        :value="textAttrs.vAlign"
        @update:value="val => updateTextAttrs({ vAlign: val as TextAlignVertical })"
        style="width: 100%;"
      >
        <RadioButton value="top" v-tooltip="'Align Top'" style="flex: 1;"><i-icon-park-outline:align-text-top-one /> Top</RadioButton>
        <RadioButton value="middle" v-tooltip="'Align Middle'" style="flex: 1;"><i-icon-park-outline:align-text-middle-one /> Middle</RadioButton>
        <RadioButton value="bottom" v-tooltip="'Align Bottom'" style="flex: 1;"><i-icon-park-outline:align-text-bottom-one /> Bottom</RadioButton>
      </RadioGroup>
    </div>

    <Divider />

    <!-- Borders -->
    <div class="section-title">Table Outline</div>
    <ElementOutline :fixed="true" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { PPTTableElement, TableCell, TableCellStyle, TextAlign, TextAlignVertical } from '@/types/slides'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import ElementOutline from '../common/ElementOutline.vue'
import Popover from '@/components/Popover.vue'
import ColorPicker from '@/components/ColorPicker/index.vue'
import ColorButton from '@/components/ColorButton.vue'
import RadioButton from '@/components/RadioButton.vue'
import RadioGroup from '@/components/RadioGroup.vue'
import Divider from '@/components/Divider.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { handleElement, handleElementId, selectedTableCells } = storeToRefs(mainStore)
const { addHistorySnapshot } = useHistorySnapshot()

const currentTable = computed(() => handleElement.value as PPTTableElement)

const primaryTargetCell = computed<TableCell | null>(() => {
  if (!currentTable.value?.data?.length) return null
  if (selectedTableCells.value.length) {
    const [r, c] = selectedTableCells.value[0].split('_').map(Number)
    return currentTable.value.data[r]?.[c] || null
  }
  return currentTable.value.data[0]?.[0] || null
})

const textAttrs = computed(() => ({
  align: primaryTargetCell.value?.style?.align || 'left',
  vAlign: primaryTargetCell.value?.style?.vAlign || 'middle',
  backcolor: primaryTargetCell.value?.style?.backcolor || '#ffffff',
}))

const cellFill = computed(() => textAttrs.value.backcolor || '#ffffff')

const getTargetCoordinates = (): [number, number][] => {
  if (selectedTableCells.value.length) {
    return selectedTableCells.value.map(key => {
      const [r, c] = key.split('_').map(Number)
      return [r, c]
    })
  }
  const coords: [number, number][] = []
  const data = currentTable.value?.data || []
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      coords.push([r, c])
    }
  }
  return coords
}

const mutateTargetCells = (updater: (style: TableCellStyle) => TableCellStyle) => {
  if (!currentTable.value) return
  const data: TableCell[][] = JSON.parse(JSON.stringify(currentTable.value.data))
  const targets = getTargetCoordinates()

  for (const [r, c] of targets) {
    if (!data[r] || !data[r][c]) continue
    const cell = data[r][c]
    cell.style = updater(cell.style || {})
  }

  slidesStore.updateElement({ id: handleElementId.value, props: { data } })
  addHistorySnapshot()
}

const updateTextAttrs = (props: Partial<TableCellStyle>) => {
  mutateTargetCells(existing => ({
    ...existing,
    ...props,
  }))
}

const updateCellFill = (color: string) => {
  mutateTargetCells(existing => ({
    ...existing,
    backcolor: color,
  }))
}
</script>

<style lang="scss" scoped>
.cell-tab {
  font-size: 12px;
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

.row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.label {
  width: 90px;
  color: var(--text-secondary, #515154);
  font-size: 12px;
}

.radio-cluster {
  display: flex;
  background: var(--bg-control, rgba(0, 0, 0, 0.05));
  padding: 2px;
  border-radius: 8px;
}
</style>
