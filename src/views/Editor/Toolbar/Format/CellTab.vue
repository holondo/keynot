<template>
  <div class="cell-tab">
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
    <div class="section-title">Cell Border</div>
    <ElementOutline :fixed="true" />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { PPTTableElement, TableCell, TextAlign, TextAlignVertical } from '@/types/slides'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import ElementOutline from '../common/ElementOutline.vue'
import Popover from '@/components/Popover.vue'
import ColorPicker from '@/components/ColorPicker/index.vue'
import ColorButton from '@/components/ColorButton.vue'
import RadioButton from '@/components/RadioButton.vue'
import RadioGroup from '@/components/RadioGroup.vue'
import Divider from '@/components/Divider.vue'

const slidesStore = useSlidesStore()
const { handleElement, handleElementId } = storeToRefs(useMainStore())

const currentTable = computed(() => handleElement.value as PPTTableElement)

const textAttrs = ref({
  align: 'left' as TextAlign,
  vAlign: 'middle' as TextAlignVertical,
  backcolor: '#ffffff',
})

const cellFill = computed(() => textAttrs.value.backcolor || '#ffffff')

const { addHistorySnapshot } = useHistorySnapshot()

const updateTextAttrs = (props: any) => {
  textAttrs.value = { ...textAttrs.value, ...props }
  // Emit table command or update cell formatting
}

const updateCellFill = (color: string) => {
  textAttrs.value.backcolor = color
  if (!currentTable.value) return
  // Apply fill color to table cells
  const data = JSON.parse(JSON.stringify(currentTable.value.data)) as TableCell[][]
  for (const row of data) {
    for (const cell of row) {
      if (cell.style) cell.style.backcolor = color
      else cell.style = { backcolor: color }
    }
  }
  slidesStore.updateElement({ id: handleElementId.value, props: { data } })
  addHistorySnapshot()
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
