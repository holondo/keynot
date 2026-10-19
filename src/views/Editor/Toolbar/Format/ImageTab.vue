<template>
  <div class="keynote-image-tab" v-if="handleImageElement">
    <!-- File Info Section -->
    <div class="section-title">File Info</div>
    <div class="file-info-row">
      <div class="file-name-col">
        <i-icon-park-outline:file-editing class="doc-icon" />
        <span class="file-name" :title="imageFileName">{{ imageFileName }}</span>
      </div>
      <FileInput @change="files => replaceImage(files)">
        <Button class="keynote-btn replace-btn">Replace...</Button>
      </FileInput>
    </div>

    <!-- Mask & Crop Tools (Apple Keynote Style) -->
    <div class="section-title">Mask &amp; Crop</div>
    <div class="action-buttons-group">
      <Button class="keynote-full-btn" @click.stop="clipImage($event)">
        <i-icon-park-outline:tailoring class="btn-icon" /> Edit Mask
      </Button>

      <!-- Mask with Shape Popover -->
      <Popover trigger="click" placement="bottom" :offset="6">
        <template #content>
          <div class="shape-mask-popover">
            <div class="popover-heading">Mask with Shape</div>
            <div class="shape-grid">
              <div
                v-for="shape in shapeMasks"
                :key="shape.key"
                class="shape-item"
                :title="shape.name"
                @click="applyShapeMask(shape.key)"
              >
                <div class="shape-preview" :style="{ clipPath: shape.style }"></div>
                <span class="shape-label">{{ shape.name }}</span>
              </div>
            </div>
          </div>
        </template>
        <Button class="keynote-full-btn">
          <i-icon-park-outline:graphic-design class="btn-icon" /> Mask with Shape...
        </Button>
      </Popover>

      <Button 
        class="keynote-full-btn" 
        v-if="handleImageElement?.clip" 
        @click="resetMask()"
        v-tooltip="'Revert mask and restore original image dimensions'"
      >
        <i-icon-park-outline:undo class="btn-icon" /> Reset Mask
      </Button>

      <Button class="keynote-full-btn" @click="setAsBackground()">
        <i-icon-park-outline:pic class="btn-icon" /> Set as Slide Background
      </Button>
    </div>

    <Divider :margin="12" />

    <!-- Adjustments Section -->
    <div class="section-title">Adjustments</div>

    <!-- Exposure Slider (-100% to +100%, 0 is normal) -->
    <div class="adjustment-row">
      <span class="adj-label">Exposure</span>
      <div class="adj-controls">
        <Slider
          style="flex: 1;"
          :min="-100"
          :max="100"
          :step="1"
          :value="getAdjustment('brightness')"
          @update:value="val => setAdjustment('brightness', val as number)"
        />
        <NumberInput
          style="width: 72px;"
          :value="getAdjustment('brightness')"
          :min="-100"
          :max="100"
          :step="1"
          @update:value="val => setAdjustment('brightness', val)"
        >
          <template #suffix>%</template>
        </NumberInput>
      </div>
    </div>

    <!-- Saturation Slider (-100% to +100%, 0 is normal) -->
    <div class="adjustment-row">
      <span class="adj-label">Saturation</span>
      <div class="adj-controls">
        <Slider
          style="flex: 1;"
          :min="-100"
          :max="100"
          :step="1"
          :value="getAdjustment('saturate')"
          @update:value="val => setAdjustment('saturate', val as number)"
        />
        <NumberInput
          style="width: 72px;"
          :value="getAdjustment('saturate')"
          :min="-100"
          :max="100"
          :step="1"
          @update:value="val => setAdjustment('saturate', val)"
        >
          <template #suffix>%</template>
        </NumberInput>
      </div>
    </div>

    <!-- Contrast Slider (-100% to +100%, 0 is normal) -->
    <div class="adjustment-row">
      <span class="adj-label">Contrast</span>
      <div class="adj-controls">
        <Slider
          style="flex: 1;"
          :min="-100"
          :max="100"
          :step="1"
          :value="getAdjustment('contrast')"
          @update:value="val => setAdjustment('contrast', val as number)"
        />
        <NumberInput
          style="width: 72px;"
          :value="getAdjustment('contrast')"
          :min="-100"
          :max="100"
          :step="1"
          @update:value="val => setAdjustment('contrast', val)"
        >
          <template #suffix>%</template>
        </NumberInput>
      </div>
    </div>

    <!-- Enhance, Advanced Levels, and Reset Buttons -->
    <div class="adjustment-action-bar">
      <Button class="adj-action-btn" @click="autoEnhance()" v-tooltip="'Auto-adjust contrast, exposure, and saturation'">
        <i-icon-park-outline:magic /> Enhance
      </Button>

      <Popover trigger="click" placement="top-end" :offset="8">
        <template #content>
          <div class="advanced-adjustments-popover">
            <div class="popover-title">Detailed Levels</div>
            <div class="adj-slider-row">
              <span class="slider-title">Blur:</span>
              <Slider
                style="flex: 1;"
                :min="0"
                :max="30"
                :step="1"
                :value="getAdjustment('blur')"
                @update:value="val => setAdjustment('blur', val as number)"
              />
              <span class="slider-val">{{ getAdjustment('blur') }}px</span>
            </div>
            <div class="adj-slider-row">
              <span class="slider-title">Hue:</span>
              <Slider
                style="flex: 1;"
                :min="0"
                :max="360"
                :step="10"
                :value="getAdjustment('hue-rotate')"
                @update:value="val => setAdjustment('hue-rotate', val as number)"
              />
              <span class="slider-val">{{ getAdjustment('hue-rotate') }}°</span>
            </div>
            <div class="adj-slider-row">
              <span class="slider-title">Opacity:</span>
              <Slider
                style="flex: 1;"
                :min="0"
                :max="100"
                :step="5"
                :value="getAdjustment('opacity')"
                @update:value="val => setAdjustment('opacity', val as number)"
              />
              <span class="slider-val">{{ getAdjustment('opacity') }}%</span>
            </div>
            <div class="adj-slider-row">
              <span class="slider-title">B&amp;W:</span>
              <Slider
                style="flex: 1;"
                :min="0"
                :max="100"
                :step="5"
                :value="getAdjustment('grayscale')"
                @update:value="val => setAdjustment('grayscale', val as number)"
              />
              <span class="slider-val">{{ getAdjustment('grayscale') }}%</span>
            </div>
            <div class="adj-slider-row">
              <span class="slider-title">Sepia:</span>
              <Slider
                style="flex: 1;"
                :min="0"
                :max="100"
                :step="5"
                :value="getAdjustment('sepia')"
                @update:value="val => setAdjustment('sepia', val as number)"
              />
              <span class="slider-val">{{ getAdjustment('sepia') }}%</span>
            </div>
          </div>
        </template>
        <Button class="adj-action-btn" title="Detailed Levels">
          <i-icon-park-outline:more-two /> More
        </Button>
      </Popover>

      <Button class="adj-action-btn" @click="resetAdjustments()" v-tooltip="'Clear all adjustments'">
        <i-icon-park-outline:refresh /> Reset
      </Button>
    </div>

    <Divider :margin="12" />

    <!-- Description Section (Alt text for accessibility) -->
    <div class="section-title">Description</div>
    <div class="description-box">
      <textarea
        class="desc-textarea"
        placeholder="Add image description for accessibility..."
        :value="(handleImageElement as any).alt || ''"
        @input="e => updateAlt((e.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { PPTImageElement, ImageElementFilters, ImageElementFilterKeys } from '@/types/slides'
import {
  createFilterValue,
  parseFilterSliderValue,
  getAutoEnhanceFilters,
  calculateResetMask,
  createShapeMask,
} from '@/utils/imageAdjustments'
import { CLIPPATHS, getClipPath } from '@/configs/imageClip'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useImageHandler from '@/hooks/useImageHandler'
import message from '@/utils/message'

import Button from '@/components/Button.vue'
import Slider from '@/components/Slider.vue'
import NumberInput from '@/components/NumberInput.vue'
import Divider from '@/components/Divider.vue'
import FileInput from '@/components/FileInput.vue'
import Popover from '@/components/Popover.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { handleElement, handleElementId } = storeToRefs(mainStore)

const handleImageElement = handleElement as Ref<PPTImageElement>

const { addHistorySnapshot } = useHistorySnapshot()
const { replaceImage } = useImageHandler()

const imageFileName = computed(() => {
  if (!handleImageElement.value?.src) return 'Image.png'
  const src = handleImageElement.value.src
  if (src.startsWith('data:')) return 'Image_layer.jpg'
  const parts = src.split('/')
  const raw = parts[parts.length - 1] || 'Image'
  if (raw.length > 28) return raw.substring(0, 16) + '...' + raw.substring(raw.length - 8)
  return raw
})

const filters = computed<ImageElementFilters>(() => {
  return handleImageElement.value?.filters || {}
})

const getAdjustment = (key: ImageElementFilterKeys): number => {
  return parseFilterSliderValue(key, filters.value[key])
}

const updateImage = (props: Partial<PPTImageElement>) => {
  if (!handleElementId.value) return
  slidesStore.updateElement({ id: handleElementId.value, props })
  addHistorySnapshot()
}

const setAdjustment = (filterKey: ImageElementFilterKeys, sliderValue: number) => {
  const currentFilters: ImageElementFilters = { ...(handleImageElement.value.filters || {}) }
  const cssValue = createFilterValue(filterKey, sliderValue)
  currentFilters[filterKey] = cssValue
  updateImage({ filters: currentFilters })
}

const clipImage = (e?: MouseEvent) => {
  e?.stopPropagation()
  if (!handleElementId.value) return
  mainStore.setClipingImageElementId(handleElementId.value)
}

const resetMask = () => {
  if (!handleElementId.value || !handleImageElement.value) return
  const restored = calculateResetMask(handleImageElement.value)
  slidesStore.updateElement({
    id: handleElementId.value,
    props: {
      left: restored.left,
      top: restored.top,
      width: restored.width,
      height: restored.height,
    },
  })
  slidesStore.removeElementProps({
    id: handleElementId.value,
    propName: ['clip'],
  })
  addHistorySnapshot()
  message.success('Reset mask to original image dimensions')
}

// Shape Masking Presets
const shapeMasks = [
  { key: 'rect', name: 'Rectangle', style: getClipPath('rect').style },
  { key: 'roundRect', name: 'Rounded', style: getClipPath('roundRect').style },
  { key: 'ellipse', name: 'Circle', style: getClipPath('ellipse').style },
  { key: 'rhombus', name: 'Diamond', style: getClipPath('rhombus').style },
  { key: 'triangle', name: 'Triangle', style: getClipPath('triangle').style },
  { key: 'star', name: 'Star', style: getClipPath('star').style },
  { key: 'heart', name: 'Heart', style: getClipPath('heart').style },
  { key: 'hexagon', name: 'Hexagon', style: getClipPath('hexagon').style },
]

const applyShapeMask = (shapeKey: string) => {
  if (!handleElementId.value) return
  const clip = createShapeMask(shapeKey)
  updateImage({ clip })
  message.success(`Applied ${shapeKey} mask`)
}

const setAsBackground = () => {
  if (!handleImageElement.value) return
  slidesStore.updateSlide({
    background: {
      type: 'image',
      image: {
        src: handleImageElement.value.src,
        size: 'cover',
      },
    },
  })
  addHistorySnapshot()
  message.success('Set image as slide background')
}

const autoEnhance = () => {
  const enhanced = getAutoEnhanceFilters(filters.value)
  updateImage({ filters: enhanced })
  message.success('Applied Keynote Auto-Enhance')
}

const resetAdjustments = () => {
  if (!handleElementId.value) return
  slidesStore.removeElementProps({
    id: handleElementId.value,
    propName: 'filters',
  })
  addHistorySnapshot()
  message.info('Reset all image adjustments')
}

const updateAlt = (alt: string) => {
  if (handleImageElement.value) {
    (handleImageElement.value as any).alt = alt
    addHistorySnapshot()
  }
}
</script>

<style lang="scss" scoped>
.keynote-image-tab {
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

.file-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;

  .file-name-col {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex: 1;

    .doc-icon {
      font-size: 15px;
      color: var(--accent-color, #007aff);
      flex-shrink: 0;
    }

    .file-name {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-primary, #1d1d1f);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .replace-btn {
    height: 26px;
    padding: 0 10px;
    font-size: 11.5px;
    font-weight: 500;
    border-radius: 6px;
  }
}

.action-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;

  .keynote-full-btn {
    width: 100%;
    height: 28px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--bg-control, rgba(0, 0, 0, 0.05));
    color: var(--text-primary, #1d1d1f);
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
    transition: all 0.15s ease;

    &:hover {
      background: var(--bg-control-active, rgba(0, 0, 0, 0.08));
      color: var(--accent-color, #007aff);
      border-color: var(--accent-color, #007aff);
    }

    .btn-icon {
      font-size: 14px;
    }
  }
}

.shape-mask-popover {
  width: 220px;
  padding: 10px;

  .popover-heading {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-tertiary, #86868b);
    margin-bottom: 8px;
  }

  .shape-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;

    .shape-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 6px 2px;
      border-radius: 6px;
      transition: background-color 0.12s;

      &:hover {
        background-color: var(--bg-control, rgba(0, 0, 0, 0.06));
      }

      .shape-preview {
        width: 28px;
        height: 28px;
        background-color: var(--accent-color, #007aff);
      }

      .shape-label {
        font-size: 9.5px;
        color: var(--text-secondary, #515154);
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
      }
    }
  }
}

.adjustment-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
  gap: 4px;

  .adj-label {
    font-size: 11px;
    color: var(--text-secondary, #515154);
    font-weight: 500;
  }

  .adj-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.adjustment-action-bar {
  display: flex;
  gap: 6px;
  margin-top: 10px;

  .adj-action-btn {
    flex: 1;
    height: 26px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0 4px;
    background: var(--bg-control, rgba(0, 0, 0, 0.04));
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));

    &:hover {
      background: var(--bg-control-active, rgba(0, 0, 0, 0.08));
      color: var(--accent-color, #007aff);
    }
  }
}

.advanced-adjustments-popover {
  width: 250px;
  padding: 12px;

  .popover-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-tertiary, #86868b);
    margin-bottom: 10px;
  }

  .adj-slider-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .slider-title {
      width: 52px;
      font-size: 11px;
      color: var(--text-secondary, #515154);
    }

    .slider-val {
      width: 38px;
      font-size: 10.5px;
      color: var(--text-tertiary, #86868b);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  }
}

.description-box {
  margin-top: 6px;

  .desc-textarea {
    width: 100%;
    height: 60px;
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
    background: var(--bg-input, rgba(255, 255, 255, 0.8));
    font-size: 11.5px;
    color: var(--text-primary, #1d1d1f);
    resize: none;
    outline: none;
    box-sizing: border-box;

    &:focus {
      border-color: var(--accent-color, #007aff);
      background: var(--bg-card, #fff);
    }
  }
}
</style>
