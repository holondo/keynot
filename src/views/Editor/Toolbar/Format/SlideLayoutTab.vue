<template>
  <div class="slide-layout-tab">
    <!-- Slide Layout Title -->
    <div class="card-hero">
      <div class="card-hero-thumb">
        <i-icon-park-outline:slide-two />
      </div>
      <div class="card-hero-meta">
        <div class="card-hero-name">{{ t('inspector.slideLayout.defaultLayout') }}</div>
        <div class="card-hero-sub">{{ t('inspector.slideLayout.slideOf', undefined, { current: slideIndex + 1, total: slides.length }) }}</div>
      </div>
    </div>

    <Divider />

    <!-- Slide Background -->
    <div class="section-title">{{ t('inspector.slideLayout.background') }}</div>
    <div class="row">
      <Select 
        style="flex: 1;" 
        :value="background.type" 
        @update:value="v => updateBackgroundType(v as 'gradient' | 'image' | 'solid')"
        :options="[
          { label: t('inspector.slideLayout.colorFill'), value: 'solid' },
          { label: t('inspector.slideLayout.imageFill'), value: 'image' },
          { label: t('inspector.slideLayout.gradientFill'), value: 'gradient' },
        ]"
      />
      <div style="width: 8px;"></div>

      <Popover trigger="click" v-if="background.type === 'solid'" style="width: 44px;">
        <template #content>
          <ColorPicker
            :modelValue="background.color"
            @update:modelValue="color => updateBackground({ color })"
          />
        </template>
        <ColorButton :color="background.color || '#fff'" />
      </Popover>

      <Select 
        style="flex: 1;" 
        :value="background.image?.size || 'cover'" 
        @update:value="v => updateImageBackground({ size: v as SlideBackgroundImageSize })"
        v-else-if="background.type === 'image'"
        :options="[
          { label: t('inspector.slideLayout.scaleToFill'), value: 'cover' },
          { label: t('inspector.slideLayout.scaleToFit'), value: 'contain' },
          { label: t('inspector.slideLayout.tile'), value: 'repeat' },
        ]"
      />

      <Select 
        style="flex: 1;" 
        :value="background.gradient?.type || 'linear'" 
        @update:value="v => updateGradientBackground({ type: v as GradientType })"
        v-else
        :options="[
          { label: 'Linear Gradient', value: 'linear' },
          { label: 'Radial Gradient', value: 'radial' },
        ]"
      />
    </div>

    <!-- Image Fill Upload -->
    <div class="background-image-box" v-if="background.type === 'image'">
      <FileInput @change="files => uploadBackgroundImage(files)">
        <div class="upload-area" :style="{ backgroundImage: background.image?.src ? `url(${background.image.src})` : 'none' }">
          <span v-if="!background.image?.src"><i-icon-park-outline:plus /> Choose Image...</span>
          <span v-else class="replace-badge">Change...</span>
        </div>
      </FileInput>
    </div>

    <!-- Gradient Settings -->
    <div class="gradient-settings" v-if="background.type === 'gradient'">
      <div class="row">
        <GradientBar
          :value="background.gradient?.colors || []"
          :index="currentGradientIndex"
          @update:value="v => updateGradientBackground({ colors: v })"
          @update:index="idx => currentGradientIndex = idx"
        />
      </div>
      <div class="row" v-if="background.gradient?.type === 'linear'">
        <span class="sublabel">Angle:</span>
        <Slider
          :min="0"
          :max="360"
          :step="15"
          :value="background.gradient.rotate || 0"
          @update:value="v => updateGradientBackground({ rotate: v as number })"
          style="flex: 1; margin-left: 10px;"
        />
      </div>
    </div>

    <div class="row" style="margin-top: 10px;">
      <Button style="width: 100%;" @click="applyBackgroundAllSlide">
        {{ t('inspector.slideLayout.applyAll') }}
      </Button>
    </div>

    <Divider />

    <!-- Slide Size / Aspect Ratio -->
    <div class="section-title">{{ t('inspector.slideLayout.slideSize') }}</div>
    <div class="row">
      <Select 
        style="width: 100%;" 
        :value="viewportRatio" 
        @update:value="v => updateViewportRatio(v as number)"
        :options="[
          { label: 'Widescreen (16:9)', value: 0.5625 },
          { label: 'Widescreen (16:10)', value: 0.625 },
          { label: 'Standard (4:3)', value: 0.75 },
          { label: 'Landscape (A4)', value: 0.70710678 },
          { label: 'Portrait (A4)', value: 1.41421356 },
        ]"
      />
    </div>

    <Divider />

    <!-- Presentation Theme -->
    <div class="section-title">{{ t('inspector.slideLayout.presentationTheme') }}</div>
    <div class="row">
      <span class="sublabel">{{ t('inspector.slideLayout.font') }}</span>
      <Select
        style="flex: 1; margin-left: 10px;"
        :value="theme.fontName"
        search
        searchLabel="Search font"
        @update:value="v => updateTheme({ fontName: v as string })"
        :options="FONTS"
      />
    </div>
    <div class="row">
      <span class="sublabel">{{ t('inspector.slideLayout.textColor') }}</span>
      <Popover trigger="click" style="flex: 1; margin-left: 10px;">
        <template #content>
          <ColorPicker
            :modelValue="theme.fontColor"
            @update:modelValue="color => updateTheme({ fontColor: color })"
          />
        </template>
        <ColorButton :color="theme.fontColor" />
      </Popover>
    </div>
    <div class="row">
      <span class="sublabel">{{ t('inspector.slideLayout.palette') }}</span>
      <div style="flex: 1; margin-left: 10px;" @click="themeColorsSettingVisible = true">
        <ColorListButton :colors="theme.themeColors" />
      </div>
    </div>

    <Modal v-model:visible="themeColorsSettingVisible" :width="500">
      <ThemeColorsSetting @close="themeColorsSettingVisible = false" />
    </Modal>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import type { SlideBackground, SlideBackgroundImageSize, GradientType, SlideTheme } from '@/types/slides'
import { FONTS } from '@/configs/font'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import { getImageDataURL } from '@/utils/image'
import Select from '@/components/Select.vue'
import Button from '@/components/Button.vue'
import Popover from '@/components/Popover.vue'
import ColorPicker from '@/components/ColorPicker/index.vue'
import ColorButton from '@/components/ColorButton.vue'
import ColorListButton from '@/components/ColorListButton.vue'
import Slider from '@/components/Slider.vue'
import FileInput from '@/components/FileInput.vue'
import GradientBar from '@/components/GradientBar.vue'
import Divider from '@/components/Divider.vue'
import Modal from '@/components/Modal.vue'
import ThemeColorsSetting from '../SlideDesignPanel/ThemeColorsSetting.vue'
import { t } from '@/i18n'

const slidesStore = useSlidesStore()
const { slides, currentSlide, slideIndex, viewportRatio, theme } = storeToRefs(slidesStore)

const background = computed<SlideBackground>(() => currentSlide.value?.background || { type: 'solid', color: '#ffffff' })
const { addHistorySnapshot } = useHistorySnapshot()

const updateTheme = (props: Partial<SlideTheme>) => {
  slidesStore.setTheme(props)
  addHistorySnapshot()
}

const currentGradientIndex = ref(0)
const themeColorsSettingVisible = ref(false)

const updateBackground = (props: Partial<SlideBackground>) => {
  slidesStore.updateSlide({ background: { ...background.value, ...props } })
  addHistorySnapshot()
}

const updateBackgroundType = (type: 'solid' | 'image' | 'gradient') => {
  if (type === 'solid') {
    updateBackground({ type, color: background.value?.color || '#ffffff' })
  } else if (type === 'image') {
    updateBackground({
      type,
      image: background.value?.image || { src: '', size: 'cover' },
    })
  } else {
    updateBackground({
      type,
      gradient: background.value?.gradient || {
        type: 'linear',
        rotate: 0,
        colors: [
          { color: '#ffffff', pos: 0 },
          { color: '#007aff', pos: 100 },
        ],
      },
    })
  }
}

const updateImageBackground = (props: any) => {
  if (!background.value?.image) return
  updateBackground({ image: { ...background.value.image, ...props } })
}

const updateGradientBackground = (props: any) => {
  if (!background.value?.gradient) return
  updateBackground({ gradient: { ...background.value.gradient, ...props } })
}

const uploadBackgroundImage = (files: FileList) => {
  const file = files[0]
  if (!file) return
  getImageDataURL(file).then(src => {
    updateBackground({
      type: 'image',
      image: { src, size: 'cover' },
    })
  })
}

const applyBackgroundAllSlide = () => {
  const newSlides = slides.value.map(slide => ({
    ...slide,
    background: JSON.parse(JSON.stringify(background.value)),
  }))
  slidesStore.setSlides(newSlides)
  addHistorySnapshot()
}

const updateViewportRatio = (ratio: number) => {
  slidesStore.setViewportRatio(ratio)
  addHistorySnapshot()
}
</script>

<style lang="scss" scoped>
.slide-layout-tab {
  padding: 12px 14px;
  font-size: 12px;
  color: var(--text-primary, #1d1d1f);
}

.card-hero {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: var(--bg-inspector-card, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: 10px;
  margin-bottom: 8px;
}

.card-hero-thumb {
  width: 38px;
  height: 26px;
  background: var(--accent-color, #007aff);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 16px;
  margin-right: 10px;
  flex-shrink: 0;
}

.card-hero-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #1d1d1f);
}

.card-hero-sub {
  font-size: 11px;
  color: var(--text-tertiary, #86868b);
  margin-top: 1px;
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

.sublabel {
  font-size: 12px;
  color: var(--text-secondary, #515154);
  width: 70px;
  flex-shrink: 0;
}

.background-image-box {
  margin-bottom: 10px;

  .upload-area {
    height: 70px;
    border: 1px dashed rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-size: cover;
    background-position: center;
    cursor: pointer;
    font-size: 12px;
    color: #007aff;

    &:hover {
      border-color: #007aff;
    }
  }

  .replace-badge {
    background: rgba(0, 0, 0, 0.65);
    color: #fff;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
  }
}
</style>
