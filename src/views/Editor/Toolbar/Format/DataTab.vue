<template>
  <div class="keynote-data-tab" v-if="currentTable">
    <div class="section-title">{{ t('inspector.data.format') }}</div>
    
    <div class="control-row">
      <Select
        style="width: 100%;"
        :value="currentFormatKind"
        :options="formatOptions"
        @update:value="val => handleFormatKindChange(val as CellDataFormatType)"
      />
    </div>

    <!-- Number options -->
    <template v-if="currentFormatKind === 'number'">
      <div class="control-row label-value-row">
        <span class="row-label">{{ t('inspector.data.decimals') }}</span>
        <NumberInput
          style="width: 80px;"
          :min="0"
          :max="10"
          :value="currentDecimals"
          @update:value="val => updateFormatOption({ decimals: val })"
        />
      </div>
      <div class="control-row checkboxes-row">
        <Checkbox
          :value="currentThousands"
          @update:value="val => updateFormatOption({ thousandsSeparator: val })"
        >
          Thousands Separator
        </Checkbox>
      </div>
    </template>

    <!-- Currency options -->
    <template v-else-if="currentFormatKind === 'currency'">
      <div class="control-row label-value-row">
        <span class="row-label">{{ t('inspector.data.currency') }}</span>
        <Select
          style="width: 140px;"
          :value="currentCurrency"
          :options="currencyOptions"
          @update:value="val => updateFormatOption({ currencyCode: val as string })"
        />
      </div>
      <div class="control-row label-value-row">
        <span class="row-label">{{ t('inspector.data.decimals') }}</span>
        <NumberInput
          style="width: 80px;"
          :min="0"
          :max="10"
          :value="currentDecimals"
          @update:value="val => updateFormatOption({ decimals: val })"
        />
      </div>
    </template>

    <!-- Percentage options -->
    <template v-else-if="currentFormatKind === 'percentage'">
      <div class="control-row label-value-row">
        <span class="row-label">{{ t('inspector.data.decimals') }}</span>
        <NumberInput
          style="width: 80px;"
          :min="0"
          :max="10"
          :value="currentDecimals"
          @update:value="val => updateFormatOption({ decimals: val })"
        />
      </div>
    </template>

    <!-- Scientific options -->
    <template v-else-if="currentFormatKind === 'scientific'">
      <div class="control-row label-value-row">
        <span class="row-label">{{ t('inspector.data.decimals') }}</span>
        <NumberInput
          style="width: 80px;"
          :min="0"
          :max="10"
          :value="currentDecimals"
          @update:value="val => updateFormatOption({ decimals: val })"
        />
      </div>
    </template>

    <Divider :margin="12" />

    <div class="selection-status">
      <span v-if="selectedCount > 1">Applied to {{ selectedCount }} selected cells</span>
      <span v-else-if="selectedCount === 1">Applied to active cell</span>
      <span v-else>Select cells in table to format</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { CellDataFormat, CellDataFormatType, PPTTableElement, TableCell } from '@/types/slides'
import { formatCellValue } from '@/utils/tableDataFormatter'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import Select from '@/components/Select.vue'
import NumberInput from '@/components/NumberInput.vue'
import Checkbox from '@/components/Checkbox.vue'
import Divider from '@/components/Divider.vue'

import { t } from '@/i18n'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { handleElement, handleElementId, selectedTableCells } = storeToRefs(mainStore)
const { addHistorySnapshot } = useHistorySnapshot()

const currentTable = computed(() => handleElement.value as PPTTableElement)

const formatOptions = computed(() => [
  { label: t('inspector.data.automatic'), value: 'automatic' },
  { label: t('inspector.data.number'), value: 'number' },
  { label: t('inspector.data.currency'), value: 'currency' },
  { label: t('inspector.data.percentage'), value: 'percentage' },
  { label: t('inspector.data.fraction'), value: 'fraction' },
  { label: t('inspector.data.scientific'), value: 'scientific' },
  { label: t('inspector.data.text'), value: 'text' },
  { label: t('inspector.data.dateTime'), value: 'dateTime' },
])

const currencyOptions = [
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' },
  { label: 'BRL (R$)', value: 'BRL' },
  { label: 'JPY (¥)', value: 'JPY' },
  { label: 'CNY (¥)', value: 'CNY' },
]

const selectedCount = computed(() => selectedTableCells.value.length)

const primaryTargetCell = computed<TableCell | null>(() => {
  if (!currentTable.value?.data?.length) return null
  if (selectedTableCells.value.length) {
    const [r, c] = selectedTableCells.value[0].split('_').map(Number)
    return currentTable.value.data[r]?.[c] || null
  }
  return currentTable.value.data[0]?.[0] || null
})

const currentFormatKind = computed<CellDataFormatType>(() => {
  return primaryTargetCell.value?.dataFormat?.kind || 'automatic'
})

const currentDecimals = computed<number>(() => {
  return primaryTargetCell.value?.dataFormat?.decimals ?? 2
})

const currentThousands = computed<boolean>(() => {
  return primaryTargetCell.value?.dataFormat?.thousandsSeparator ?? true
})

const currentCurrency = computed<string>(() => {
  return primaryTargetCell.value?.dataFormat?.currencyCode || 'USD'
})

const getTargetCoordinates = (): [number, number][] => {
  if (selectedTableCells.value.length) {
    return selectedTableCells.value.map(key => {
      const [r, c] = key.split('_').map(Number)
      return [r, c]
    })
  }
  // Fallback: all cells
  const coords: [number, number][] = []
  const data = currentTable.value?.data || []
  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      coords.push([r, c])
    }
  }
  return coords
}

const applyFormatToTargets = (newFormat: CellDataFormat) => {
  if (!currentTable.value) return
  const data: TableCell[][] = JSON.parse(JSON.stringify(currentTable.value.data))
  const targets = getTargetCoordinates()

  for (const [r, c] of targets) {
    if (!data[r] || !data[r][c]) continue
    const cell = data[r][c]
    cell.dataFormat = { ...newFormat }
    cell.displayValue = formatCellValue(cell)
  }

  slidesStore.updateElement({ id: handleElementId.value, props: { data } })
  addHistorySnapshot()
}

const handleFormatKindChange = (kind: CellDataFormatType) => {
  const current = primaryTargetCell.value?.dataFormat || { kind: 'automatic' }
  const newFormat: CellDataFormat = {
    ...current,
    kind,
    decimals: current.decimals ?? (kind === 'percentage' ? 0 : 2),
    thousandsSeparator: current.thousandsSeparator ?? true,
    currencyCode: current.currencyCode || 'USD',
  }
  applyFormatToTargets(newFormat)
}

const updateFormatOption = (patch: Partial<CellDataFormat>) => {
  const current = primaryTargetCell.value?.dataFormat || { kind: 'automatic' }
  const newFormat: CellDataFormat = {
    ...current,
    ...patch,
  }
  applyFormatToTargets(newFormat)
}
</script>

<style lang="scss" scoped>
.keynote-data-tab {
  user-select: none;
  font-size: var(--text-sm);
  color: var(--text-primary, #1d1d1f);
}

.section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary, #86868b);
  margin-bottom: 8px;
}

.control-row {
  margin-bottom: 10px;
}

.label-value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.checkboxes-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-status {
  font-size: var(--text-xs);
  color: var(--text-tertiary, #86868b);
  text-align: center;
  margin-top: 8px;
}
</style>
