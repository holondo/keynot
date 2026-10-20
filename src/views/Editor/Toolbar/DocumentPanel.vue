<template>
  <div class="document-panel">
    <!-- Presentation Theme Section -->
    <div class="section-title">Presentation Theme</div>
    <div class="theme-card">
      <div class="theme-info">
        <div class="font-name">{{ theme?.fontName || 'Inter' }}</div>
        <div class="palette-preview">
          <span
            v-for="(c, i) in (theme?.themeColors || []).slice(0, 5)"
            :key="i"
            class="color-dot"
            :style="{ backgroundColor: c }"
          />
        </div>
      </div>
      <Button class="change-theme-btn" @click="openThemeChooser">
        <i-icon-park-outline:theme class="btn-icon" /> Change Theme...
      </Button>
    </div>

    <Divider :margin="12" />

    <!-- Slide Size & Aspect Ratio -->
    <div class="section-title">Slide Size</div>
    <div class="field-group">
      <Select 
        style="width: 100%;" 
        :value="sizePreset" 
        @update:value="v => handlePresetChange(v as string)"
        :options="[
          { label: 'Widescreen (16:9)', value: '16:9' },
          { label: 'Widescreen (16:10)', value: '16:10' },
          { label: 'Standard (4:3)', value: '4:3' },
          { label: 'Square (1:1)', value: '1:1' },
          { label: 'A4 Landscape', value: 'a4_l' },
          { label: 'Custom Slide Size...', value: 'custom' },
        ]"
      />
    </div>

    <!-- Custom Dimension Steppers -->
    <div class="custom-dimensions-grid" v-if="sizePreset === 'custom'">
      <div class="dimension-field">
        <span class="dim-label">Width</span>
        <NumberInput
          :min="400"
          :max="3840"
          :step="10"
          :value="customWidth"
          @update:value="v => updateCustomWidth(v)"
        >
          <template #suffix>pt</template>
        </NumberInput>
      </div>
      <div class="dimension-field">
        <span class="dim-label">Height</span>
        <NumberInput
          :min="300"
          :max="2160"
          :step="10"
          :value="customHeight"
          @update:value="v => updateCustomHeight(v)"
        >
          <template #suffix>pt</template>
        </NumberInput>
      </div>
    </div>

    <Divider :margin="12" />

    <!-- Presentation Playback Settings -->
    <div class="section-title">Presentation Playback</div>
    <div class="field-group">
      <div class="label">Presentation Type</div>
      <Select 
        style="width: 100%;" 
        :value="presentationType" 
        @update:value="v => presentationType = v as string"
        :options="[
          { label: 'Normal (Click to Advance)', value: 'normal' },
          { label: 'Self-Playing (Kiosk)', value: 'kiosk' },
          { label: 'Links Only', value: 'links' },
        ]"
      />
    </div>

    <div class="field-group" v-if="presentationType === 'kiosk'">
      <div class="label">Advance Delay</div>
      <NumberInput :min="1" :max="60" :step="1" :value="kioskDelay" @update:value="v => kioskDelay = v" style="width: 100%;">
        <template #suffix>seconds</template>
      </NumberInput>
    </div>

    <div class="checkbox-row">
      <Checkbox :value="isLooping" @update:value="v => updateLooping(v)">
        Loop presentation continuously
      </Checkbox>
    </div>

    <Divider :margin="12" />

    <!-- Document Info -->
    <div class="section-title">Document Info</div>
    <div class="field-group">
      <div class="label">Author / Presenter</div>
      <input
        class="glass-input"
        type="text"
        :value="slidesStore.author || ''"
        @input="e => slidesStore.setAuthor((e.target as HTMLInputElement).value)"
        placeholder="Enter presenter or company name"
      />
    </div>

    <div class="field-group meta-row">
      <div class="label">Total Slides:</div>
      <div class="info-badge">{{ slides.length }} slides</div>
    </div>

    <Divider :margin="12" />

    <!-- Soundtrack / Presentation Audio -->
    <div class="section-title">Soundtrack</div>
    <div class="soundtrack-card" v-if="soundtrack">
      <div class="track-header">
        <div class="track-icon">
          <i-icon-park-outline:music-one />
        </div>
        <div class="track-details">
          <div class="track-name" :title="soundtrack.name">{{ soundtrack.name }}</div>
          <div class="track-sub">Continuous Presentation Soundtrack</div>
        </div>
        <div class="track-remove" @click="removeSoundtrack" title="Remove soundtrack">
          <i-icon-park-outline:delete />
        </div>
      </div>

      <div class="track-controls">
        <audio
          ref="audioPlayerRef"
          :src="soundtrack.src"
          :loop="soundtrack.loop !== false"
          controls
          class="native-audio-player"
        ></audio>
      </div>
    </div>

    <div class="empty-soundtrack" v-else>
      <div class="soundtrack-box">
        <div class="soundtrack-icon">
          <i-icon-park-outline:music />
        </div>
        <div class="soundtrack-content">
          <div class="soundtrack-title">Continuous Audio</div>
          <div class="soundtrack-desc">Soundtrack plays seamlessly across all slides during presentation.</div>
        </div>
      </div>
      <div class="upload-row">
        <FileInput @change="files => handleAudioUpload(files)" accept="audio/*">
          <Button style="width: 100%;">
            <i-icon-park-outline:plus /> Choose Soundtrack Audio...
          </Button>
        </FileInput>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import Select from '@/components/Select.vue'
import Button from '@/components/Button.vue'
import Divider from '@/components/Divider.vue'
import Checkbox from '@/components/Checkbox.vue'
import NumberInput from '@/components/NumberInput.vue'
import FileInput from '@/components/FileInput.vue'
import message from '@/utils/message'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { slides, viewportRatio, viewportSize, theme, soundtrack, loopPresentation } = storeToRefs(slidesStore)
const { addHistorySnapshot } = useHistorySnapshot()

const presentationType = ref('normal')
const kioskDelay = ref(5)

const isLooping = computed(() => !!loopPresentation?.value)
const updateLooping = (val: boolean) => {
  slidesStore.setLoopPresentation(val)
  addHistorySnapshot()
}

// Preset mapping
const sizePreset = ref('16:9')
const customWidth = ref(1000)
const customHeight = ref(562.5)

const initPresetFromRatio = (ratio: number) => {
  if (Math.abs(ratio - 0.5625) < 0.001) sizePreset.value = '16:9'
  else if (Math.abs(ratio - 0.625) < 0.001) sizePreset.value = '16:10'
  else if (Math.abs(ratio - 0.75) < 0.001) sizePreset.value = '4:3'
  else if (Math.abs(ratio - 1.0) < 0.001) sizePreset.value = '1:1'
  else if (Math.abs(ratio - 0.7071) < 0.001) sizePreset.value = 'a4_l'
  else {
    sizePreset.value = 'custom'
    customWidth.value = viewportSize.value
    customHeight.value = Math.round(viewportSize.value * ratio)
  }
}

watch(viewportRatio, r => initPresetFromRatio(r), { immediate: true })

const handlePresetChange = (preset: string) => {
  sizePreset.value = preset
  if (preset === '16:9') {
    slidesStore.setCustomViewport(1000, 562.5)
  } else if (preset === '16:10') {
    slidesStore.setCustomViewport(1000, 625)
  } else if (preset === '4:3') {
    slidesStore.setCustomViewport(1000, 750)
  } else if (preset === '1:1') {
    slidesStore.setCustomViewport(1000, 1000)
  } else if (preset === 'a4_l') {
    slidesStore.setCustomViewport(1000, 707.1)
  } else if (preset === 'custom') {
    customWidth.value = viewportSize.value
    customHeight.value = Math.round(viewportSize.value * viewportRatio.value)
  }
  addHistorySnapshot()
}

const updateCustomWidth = (w: number) => {
  customWidth.value = w
  slidesStore.setCustomViewport(w, customHeight.value)
  addHistorySnapshot()
}

const updateCustomHeight = (h: number) => {
  customHeight.value = h
  slidesStore.setCustomViewport(customWidth.value, h)
  addHistorySnapshot()
}

const openThemeChooser = () => {
  mainStore.setThemeChooserVisible(true)
}

const handleAudioUpload = (files: FileList) => {
  const file = files[0]
  if (!file) return
  const src = URL.createObjectURL(file)
  slidesStore.setSoundtrack({
    name: file.name,
    src,
    loop: true,
    volume: 1,
  })
  message.success(`Attached "${file.name}" as presentation soundtrack`)
  addHistorySnapshot()
}

const removeSoundtrack = () => {
  slidesStore.setSoundtrack(null)
  message.info('Soundtrack removed')
  addHistorySnapshot()
}
</script>

<style lang="scss" scoped>
.document-panel {
  font-size: var(--text-sm);
  color: var(--text-primary, #1d1d1f);
  padding: 4px 0 20px;
}

.section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary, #86868b);
  margin-bottom: 8px;
}

.theme-card {
  background: var(--bg-card, rgba(255, 255, 255, 0.7));
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .theme-info {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .font-name {
      font-weight: 600;
      font-size: var(--text-sm);
      color: var(--text-primary, #1d1d1f);
    }

    .palette-preview {
      display: flex;
      align-items: center;
      gap: 4px;

      .color-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      }
    }
  }

  .change-theme-btn {
    width: 100%;
    height: 28px;
    font-size: var(--text-xs);
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;

    .btn-icon {
      font-size: var(--text-md);
    }
  }
}

.field-group {
  margin-bottom: 10px;

  .label {
    font-size: var(--text-xs);
    color: var(--text-secondary, #515154);
    margin-bottom: 4px;
  }

  &.meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;

    .label {
      margin-bottom: 0;
    }
  }
}

.custom-dimensions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;

  .dimension-field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .dim-label {
      font-size: var(--text-xs);
      color: var(--text-tertiary, #86868b);
      font-weight: 500;
    }
  }
}

.checkbox-row {
  margin-top: 6px;
  font-size: var(--text-xs);
}

.glass-input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border-radius: var(--radius-control);
  border: 1px solid transparent;
  background: var(--bg-input, rgba(255, 255, 255, 0.8));
  font-size: var(--text-sm);
  color: var(--text-primary, #1d1d1f);
  outline: none;

  &:focus {
    border-color: var(--accent-color, #007aff);
    background: var(--bg-card, #fff);
  }
}

.info-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-control, rgba(0, 0, 0, 0.05));
  border-radius: 4px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-primary, #1d1d1f);
}

.soundtrack-card {
  background: var(--bg-card, rgba(255, 255, 255, 0.7));
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .track-header {
    display: flex;
    align-items: center;
    gap: 8px;

    .track-icon {
      font-size: 18px;
      color: var(--accent-color, #007aff);
    }
    .track-details {
      flex: 1;
      min-width: 0;

      .track-name {
        font-weight: 600;
        font-size: var(--text-sm);
        color: var(--text-primary, #1d1d1f);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .track-sub {
        font-size: var(--text-xs);
        color: var(--text-tertiary, #86868b);
      }
    }
    .track-remove {
      font-size: var(--text-lg);
      color: var(--text-tertiary, #86868b);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;

      &:hover {
        color: #ff3b30;
        background: rgba(255, 59, 48, 0.1);
      }
    }
  }

  .native-audio-player {
    width: 100%;
    height: 32px;
    border-radius: var(--radius-control);
  }
}

.empty-soundtrack {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .soundtrack-box {
    display: flex;
    align-items: center;
    padding: 10px;
    background: var(--bg-control, rgba(0, 0, 0, 0.03));
    border: 1px dashed var(--border-color, rgba(0, 0, 0, 0.12));
    border-radius: var(--radius-control);

    .soundtrack-icon {
      font-size: 20px;
      color: var(--accent-color, #007aff);
      margin-right: 10px;
    }

    .soundtrack-title {
      font-weight: 600;
      color: var(--text-primary, #1d1d1f);
      font-size: var(--text-sm);
    }

    .soundtrack-desc {
      font-size: var(--text-xs);
      color: var(--text-tertiary, #86868b);
    }
  }
}
</style>
