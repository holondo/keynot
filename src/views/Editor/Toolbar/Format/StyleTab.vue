<template>
  <div class="keynote-style-tab">
    <!-- Style Presets Grid (6 rounded tiles) -->
    <div class="section-title">Style Presets</div>
    <div class="presets-grid">
      <div 
        class="preset-card"
        v-for="(preset, i) in stylePresets"
        :key="i"
        :style="{
          backgroundColor: preset.fill,
          border: preset.outline ? `${preset.outline.width || 1}px solid ${preset.outline.color}` : '1px solid rgba(0,0,0,0.1)',
          boxShadow: preset.shadow ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
        }"
        @click="applyStylePreset(preset)"
      ></div>
    </div>

    <Divider :margin="10" />

    <!-- Fill Section -->
    <div class="section-title">{{ t('inspector.style.fill') }}</div>
    <div class="control-row label-value-row">
      <Select
        style="width: 48%;"
        :value="fillType"
        @update:value="val => setFillType(val as string)"
        :options="[
          { label: t('inspector.slideLayout.colorFill'), value: 'color' },
          { label: t('inspector.slideLayout.gradientFill'), value: 'gradient' },
          { label: t('inspector.transition.none'), value: 'none' },
        ]"
      />
      <Popover trigger="click" style="width: 48%;" v-if="fillType === 'color'">
        <template #content>
          <ColorPicker :modelValue="fillColor" @update:modelValue="val => updateFillColor(val)" />
        </template>
        <ColorButton :color="fillColor" />
      </Popover>
      <div style="width: 48%; display: flex; align-items: center;" v-else-if="fillType === 'gradient'">
        <Popover trigger="click" style="flex: 1;">
          <template #content>
            <ColorPicker :modelValue="gradientColor1" @update:modelValue="val => updateGradient1(val)" />
          </template>
          <ColorButton :color="gradientColor1" />
        </Popover>
        <span style="margin: 0 4px; color: #86868b;">→</span>
        <Popover trigger="click" style="flex: 1;">
          <template #content>
            <ColorPicker :modelValue="gradientColor2" @update:modelValue="val => updateGradient2(val)" />
          </template>
          <ColorButton :color="gradientColor2" />
        </Popover>
      </div>
    </div>

    <Divider :margin="10" />

    <!-- Border Section -->
    <div class="section-title">{{ t('inspector.style.stroke') }}</div>
    <div class="control-row outline-row">
      <Select
        style="width: 40%;"
        :value="outlineStyle"
        @update:value="val => updateOutlineStyle(val as string)"
        :options="[
          { label: 'Line', value: 'solid' },
          { label: 'Dashed', value: 'dashed' },
          { label: 'Dotted', value: 'dotted' },
          { label: 'None', value: 'none' },
        ]"
      />
      <Popover trigger="click" style="width: 65px;" v-if="outlineStyle !== 'none'">
        <template #content>
          <ColorPicker :modelValue="outlineColor" @update:modelValue="val => updateOutlineColor(val)" />
        </template>
        <ColorButton :color="outlineColor" />
      </Popover>
      <NumberInput
        v-if="outlineStyle !== 'none'"
        style="width: 65px;"
        :min="0"
        :max="20"
        :step="1"
        :value="outlineWidth"
        @update:value="val => updateOutlineWidth(val)"
      >
        <template #suffix>pt</template>
      </NumberInput>
    </div>

    <Divider :margin="10" />

    <!-- Shadow Section -->
    <div class="disclosure-section">
      <div class="disclosure-header" @click="shadowOpen = !shadowOpen">
        <div class="disclosure-title">
          <i-icon-park-outline:right class="disclosure-arrow" :class="{ open: shadowOpen }" />
          <span>{{ t('inspector.style.shadow') }}</span>
        </div>
        <div class="disclosure-summary" @click.stop>
          <Select
            style="width: 105px;"
            :value="hasShadow ? 'drop' : 'none'"
            @update:value="val => toggleShadow(val === 'drop')"
            :options="[
              { label: t('inspector.style.shadow'), value: 'drop' },
              { label: t('inspector.transition.none'), value: 'none' },
            ]"
          />
        </div>
      </div>
      <div class="disclosure-body" v-if="shadowOpen && hasShadow">
        <div class="sub-row">
          <span class="sub-label">Blur:</span>
          <Slider
            style="width: 50%;"
            :min="0"
            :max="30"
            :step="1"
            :value="shadowBlur"
            @update:value="val => updateShadow({ blur: val as number })"
          />
        </div>
        <div class="sub-row">
          <span class="sub-label">Offset:</span>
          <Slider
            style="width: 50%;"
            :min="0"
            :max="30"
            :step="1"
            :value="shadowOffset"
            @update:value="val => updateShadow({ h: val as number, v: val as number })"
          />
        </div>
        <div class="sub-row">
          <span class="sub-label">Color:</span>
          <Popover trigger="click" style="width: 50%;">
            <template #content>
              <ColorPicker :modelValue="shadowColor" @update:modelValue="val => updateShadow({ color: val })" />
            </template>
            <ColorButton :color="shadowColor" />
          </Popover>
        </div>
      </div>
    </div>

    <Divider :margin="10" />

    <!-- Opacity Slider -->
    <div class="section-title">{{ t('inspector.style.opacity') }}</div>
    <div class="control-row opacity-row">
      <Slider
        style="flex: 1;"
        :min="0"
        :max="1"
        :step="0.05"
        :value="opacity"
        @update:value="val => updateOpacity(val as number)"
      />
      <NumberInput
        style="width: 65px;"
        :min="0"
        :max="100"
        :step="5"
        :value="Math.round(opacity * 100)"
        @update:value="val => updateOpacity(val / 100)"
      >
        <template #suffix>%</template>
      </NumberInput>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { PPTElement, PPTElementShadow, PPTElementOutline } from '@/types/slides'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

import Select from '@/components/Select.vue'
import Slider from '@/components/Slider.vue'
import NumberInput from '@/components/NumberInput.vue'
import Divider from '@/components/Divider.vue'
import Popover from '@/components/Popover.vue'
import ColorButton from '@/components/ColorButton.vue'
import ColorPicker from '@/components/ColorPicker/index.vue'
import { t } from '@/i18n'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { handleElement, handleElementId } = storeToRefs(mainStore)

const shadowOpen = ref(false)
const { addHistorySnapshot } = useHistorySnapshot()

const stylePresets = [
  { fill: '#007aff', outline: undefined, shadow: true },
  { fill: '#34c759', outline: undefined, shadow: true },
  { fill: '#ff9500', outline: undefined, shadow: true },
  { fill: '#ffffff', outline: { color: '#007aff', width: 2, style: 'solid' }, shadow: false },
  { fill: '#f2f2f7', outline: { color: '#86868b', width: 1, style: 'dashed' }, shadow: false },
  { fill: '#1c1c1e', outline: undefined, shadow: true },
]

const currentElement = computed<any>(() => handleElement.value || null)

const fillType = computed(() => {
  const el = currentElement.value as any
  if (!el?.fill || el.fill === 'transparent') return 'none'
  if (el?.gradient) return 'gradient'
  return 'color'
})

const fillColor = computed(() => {
  const el = currentElement.value as any
  return el?.fill || '#007aff'
})

const gradientColor1 = ref('#007aff')
const gradientColor2 = ref('#5856d6')

const outlineStyle = computed(() => {
  const outline = currentElement.value?.outline
  if (!outline || outline.width === 0) return 'none'
  return outline.style || 'solid'
})

const outlineColor = computed(() => currentElement.value?.outline?.color || '#007aff')
const outlineWidth = computed(() => currentElement.value?.outline?.width || 1)

const hasShadow = computed(() => !!currentElement.value?.shadow)
const shadowBlur = computed(() => currentElement.value?.shadow?.blur || 8)
const shadowOffset = computed(() => currentElement.value?.shadow?.h || 4)
const shadowColor = computed(() => currentElement.value?.shadow?.color || 'rgba(0,0,0,0.25)')

const opacity = computed(() => currentElement.value?.opacity === undefined ? 1 : currentElement.value.opacity)

const updateEl = (props: Record<string, any>) => {
  if (!handleElementId.value) return
  slidesStore.updateElement({ id: handleElementId.value, props })
  addHistorySnapshot()
}

const applyStylePreset = (preset: typeof stylePresets[0]) => {
  updateEl({
    fill: preset.fill,
    outline: preset.outline,
    shadow: preset.shadow ? { h: 4, v: 4, blur: 8, color: 'rgba(0,0,0,0.2)' } : undefined,
  })
}

const setFillType = (type: string) => {
  if (type === 'none') {
    updateEl({ fill: 'transparent', gradient: undefined })
  } else if (type === 'gradient') {
    updateEl({
      fill: `linear-gradient(135deg, ${gradientColor1.value}, ${gradientColor2.value})`,
      gradient: {
        type: 'linear',
        colors: [{ pos: 0, color: gradientColor1.value }, { pos: 100, color: gradientColor2.value }],
        rotate: 135,
      }
    })
  } else {
    updateEl({ fill: '#007aff', gradient: undefined })
  }
}

const updateFillColor = (color: string) => {
  updateEl({ fill: color, gradient: undefined })
}

const updateGradient1 = (c1: string) => {
  gradientColor1.value = c1
  setFillType('gradient')
}

const updateGradient2 = (c2: string) => {
  gradientColor2.value = c2
  setFillType('gradient')
}

const updateOutlineStyle = (style: string) => {
  if (style === 'none') {
    updateEl({ outline: undefined })
  } else {
    updateEl({
      outline: {
        color: outlineColor.value,
        width: outlineWidth.value || 1,
        style: style as 'solid' | 'dashed' | 'dotted',
      }
    })
  }
}

const updateOutlineColor = (color: string) => {
  const outline = { ...(currentElement.value?.outline || { width: 1, style: 'solid' }), color }
  updateEl({ outline })
}

const updateOutlineWidth = (width: number) => {
  const outline = { ...(currentElement.value?.outline || { color: '#007aff', style: 'solid' }), width }
  updateEl({ outline })
}

const toggleShadow = (enable: boolean) => {
  if (enable) {
    updateEl({ shadow: { h: 4, v: 4, blur: 8, color: 'rgba(0,0,0,0.2)' } })
  } else {
    updateEl({ shadow: undefined })
  }
}

const updateShadow = (patch: Partial<PPTElementShadow>) => {
  const current = currentElement.value?.shadow || { h: 4, v: 4, blur: 8, color: 'rgba(0,0,0,0.2)' }
  updateEl({ shadow: { ...current, ...patch } })
}

const updateOpacity = (val: number) => {
  updateEl({ opacity: val })
}
</script>

<style lang="scss" scoped>
.keynote-style-tab {
  user-select: none;
  font-size: var(--text-sm);
  color: var(--text-primary, #1d1d1f);
}

.section-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary, #1d1d1f);
  margin-bottom: 8px;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  .preset-card {
    height: 38px;
    border-radius: var(--radius-control);
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;

    &:hover {
      transform: scale(1.04);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    }
  }
}

.control-row {
  margin-bottom: 8px;

  &.label-value-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.outline-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.opacity-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.disclosure-section {
  .disclosure-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    height: 28px;

    .disclosure-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--text-primary, #1d1d1f);

      .disclosure-arrow {
        font-size: var(--text-xs);
        color: var(--text-tertiary, #86868b);
        transition: transform 0.15s ease;

        &.open {
          transform: rotate(90deg);
        }
      }
    }
  }

  .disclosure-body {
    padding-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .sub-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: var(--text-sm);

      .sub-label {
        color: var(--text-secondary, #6e6e73);
      }
    }
  }
}
</style>
