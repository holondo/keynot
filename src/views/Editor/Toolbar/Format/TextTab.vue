<template>
  <div class="keynote-text-tab">
    <!-- Big Paragraph Style Dropdown Card (Screenshot 2: "Title ⌄") -->
    <div class="paragraph-style-card">
      <Popover trigger="click" placement="bottom" :offset="4">
        <template #content>
          <div class="paragraph-styles-menu">
            <div 
              class="style-menu-item" 
              v-for="item in paragraphStyles" 
              :key="item.label"
              :class="{ active: currentStyleName === item.label }"
              @click="applyParagraphStyle(item)"
            >
              <span :style="item.previewStyle">{{ item.label }}</span>
              <i-icon-park-outline:check v-if="currentStyleName === item.label" class="check-icon" />
            </div>
          </div>
        </template>
        <div class="style-trigger">
          <span class="style-name">{{ currentStyleName }}</span>
          <i-icon-park-outline:down class="chevron" />
        </div>
      </Popover>
    </div>

    <!-- Secondary Segmented Control: Style | Layout (Screenshot 2) -->
    <div class="secondary-tabs-wrapper">
      <Tabs
        :tabs="[
          { label: t('inspector.tabs.style'), key: 'style' },
          { label: t('inspector.tabs.slideLayout'), key: 'layout' },
        ]"
        :value="subTab"
        secondary
        @update:value="val => subTab = val as 'style' | 'layout'"
      />
    </div>

    <!-- STYLE SUB-TAB -->
    <div class="tab-body" v-if="subTab === 'style'">
      <!-- Font Section -->
      <div class="section-title">Font</div>

      <!-- Font Family Dropdown -->
      <div class="control-row">
        <Select
          style="width: 100%;"
          :value="richTextAttrs.fontname || 'Helvetica Neue'"
          search
          searchLabel="Search font"
          @update:value="val => emitRichTextCommand('fontname', val as string)"
          :options="FONTS"
        />
      </div>

      <!-- Font Weight and Size Row -->
      <div class="control-row multi-controls">
        <Select
          style="width: 52%;"
          :value="currentFontWeight"
          @update:value="val => applyFontWeight(val as string)"
          :options="fontWeightOptions"
        />
        <NumberInput
          style="width: 44%;"
          :value="parseInt(richTextAttrs.fontsize) || 36"
          :min="8"
          :max="300"
          :step="1"
          @update:value="val => emitRichTextCommand('fontsize', val + 'px')"
        >
          <template #suffix>pt</template>
        </NumberInput>
      </div>

      <!-- B I U S Segmented + Advanced Gear Popup Row -->
      <div class="control-row segmented-style-row">
        <div class="style-pills">
          <button
            class="pill-btn"
            :class="{ active: richTextAttrs.bold }"
            v-tooltip="'Bold (Ctrl+B)'"
            @click="emitRichTextCommand('bold')"
          >
            <strong>B</strong>
          </button>
          <button
            class="pill-btn"
            :class="{ active: richTextAttrs.em }"
            v-tooltip="'Italic (Ctrl+I)'"
            @click="emitRichTextCommand('em')"
          >
            <em>I</em>
          </button>
          <button
            class="pill-btn"
            :class="{ active: richTextAttrs.underline }"
            v-tooltip="'Underline (Ctrl+U)'"
            @click="emitRichTextCommand('underline')"
          >
            <u>U</u>
          </button>
          <button
            class="pill-btn"
            :class="{ active: richTextAttrs.strikethrough }"
            v-tooltip="'Strikethrough'"
            @click="emitRichTextCommand('strikethrough')"
          >
            <s>S</s>
          </button>
        </div>

        <Popover trigger="click" placement="bottom-end" :offset="6">
          <template #content>
            <div class="gear-menu">
              <div class="gear-title">Advanced Typography</div>
              <div class="gear-row">
                <span>Highlight Fill:</span>
                <Popover trigger="click">
                  <template #content>
                    <ColorPicker
                      :modelValue="richTextAttrs.backcolor"
                      @update:modelValue="value => emitRichTextCommand('backcolor', value)"
                    />
                  </template>
                  <ColorButton :color="richTextAttrs.backcolor || 'transparent'" style="width: 90px;" />
                </Popover>
              </div>
              <div class="gear-row">
                <span>Superscript / Sub:</span>
                <div class="script-pills">
                  <button class="small-pill" :class="{ active: richTextAttrs.superscript }" @click="emitRichTextCommand('superscript')">X²</button>
                  <button class="small-pill" :class="{ active: richTextAttrs.subscript }" @click="emitRichTextCommand('subscript')">X₂</button>
                </div>
              </div>
            </div>
          </template>
          <button class="gear-btn" v-tooltip="'Text Options'">
            <i-icon-park-outline:setting-two />
            <i-icon-park-outline:down class="micro-chevron" />
          </button>
        </Popover>
      </div>

      <!-- Character Styles Dropdown -->
      <div class="control-row label-value-row">
        <span class="row-label">Character Styles</span>
        <Select
          style="width: 55%;"
          :value="characterStyle"
          @update:value="val => characterStyle = val as string"
          :options="[
            { label: 'None', value: 'none' },
            { label: 'Emphasis', value: 'emphasis' },
            { label: 'Underline Accent', value: 'underline-accent' },
            { label: 'Code Monospace', value: 'code' },
          ]"
        />
      </div>

      <!-- Text Color with Rainbow Wheel (Screenshot 2) -->
      <div class="control-row label-value-row">
        <span class="row-label">Text Color</span>
        <Popover trigger="click" placement="bottom-end">
          <template #content>
            <ColorPicker
              :modelValue="richTextAttrs.color"
              @update:modelValue="value => emitRichTextCommand('color', value)"
            />
          </template>
          <ColorButton :color="richTextAttrs.color || '#000000'" style="width: 55%;" />
        </Popover>
      </div>

      <!-- Alignment Row (4 Horizontal Align + 2 Indent + 3 Vertical Align) -->
      <div class="control-row alignment-capsules">
        <div class="align-group">
          <button
            class="align-btn"
            :class="{ active: richTextAttrs.align === 'left' || !richTextAttrs.align }"
            v-tooltip="'Align Left'"
            @click="emitRichTextCommand('align', 'left')"
          >
            <i-icon-park-outline:align-text-left />
          </button>
          <button
            class="align-btn"
            :class="{ active: richTextAttrs.align === 'center' }"
            v-tooltip="'Align Center'"
            @click="emitRichTextCommand('align', 'center')"
          >
            <i-icon-park-outline:align-text-center />
          </button>
          <button
            class="align-btn"
            :class="{ active: richTextAttrs.align === 'right' }"
            v-tooltip="'Align Right'"
            @click="emitRichTextCommand('align', 'right')"
          >
            <i-icon-park-outline:align-text-right />
          </button>
          <button
            class="align-btn"
            :class="{ active: (richTextAttrs.align as any) === 'justify' }"
            v-tooltip="'Justify'"
            @click="emitRichTextCommand('align', 'justify')"
          >
            <i-icon-park-outline:align-text-both />
          </button>
        </div>

        <div class="align-group">
          <button
            class="align-btn"
            v-tooltip="'Decrease Indent'"
            @click="emitRichTextCommand('indent', '-1')"
          >
            <i-icon-park-outline:indent-left />
          </button>
          <button
            class="align-btn"
            v-tooltip="'Increase Indent'"
            @click="emitRichTextCommand('indent', '+1')"
          >
            <i-icon-park-outline:indent-right />
          </button>
        </div>

        <div class="align-group">
          <button
            class="align-btn"
            :class="{ active: verticalAlign === 'top' }"
            v-tooltip="'Align Top'"
            @click="updateVerticalAlign('top')"
          >
            <i-icon-park-outline:align-top />
          </button>
          <button
            class="align-btn"
            :class="{ active: verticalAlign === 'center' }"
            v-tooltip="'Align Middle'"
            @click="updateVerticalAlign('center')"
          >
            <i-icon-park-outline:align-vertically />
          </button>
          <button
            class="align-btn"
            :class="{ active: verticalAlign === 'bottom' }"
            v-tooltip="'Align Bottom'"
            @click="updateVerticalAlign('bottom')"
          >
            <i-icon-park-outline:align-bottom />
          </button>
        </div>
      </div>

      <Divider :margin="10" />

      <!-- Spacing Disclosure Row (Screenshot 2: "› Spacing") -->
      <div class="disclosure-section">
        <div class="disclosure-header" @click="spacingOpen = !spacingOpen">
          <div class="disclosure-title">
            <i-icon-park-outline:right class="disclosure-arrow" :class="{ open: spacingOpen }" />
            <span>Spacing</span>
          </div>
          <div class="disclosure-summary" v-if="!spacingOpen" @click.stop>
            <NumberInput
              style="width: 85px;"
              :value="lineHeight"
              :min="0.5"
              :max="3"
              :step="0.1"
              @update:value="val => updateText({ lineHeight: val })"
            />
          </div>
        </div>
        <div class="disclosure-body" v-if="spacingOpen">
          <div class="sub-row">
            <span class="sub-label">Line Spacing:</span>
            <NumberInput
              style="width: 50%;"
              :value="lineHeight"
              :min="0.5"
              :max="3"
              :step="0.1"
              @update:value="val => updateText({ lineHeight: val })"
            />
          </div>
          <div class="sub-row">
            <span class="sub-label">Before Paragraph:</span>
            <NumberInput
              style="width: 50%;"
              :value="paragraphSpace"
              :min="0"
              :max="100"
              :step="2"
              @update:value="val => updateText({ paragraphSpace: val })"
            >
              <template #suffix>pt</template>
            </NumberInput>
          </div>
          <div class="sub-row">
            <span class="sub-label">Character Space:</span>
            <NumberInput
              style="width: 50%;"
              :value="wordSpace"
              :min="-5"
              :max="20"
              :step="1"
              @update:value="val => updateText({ wordSpace: val })"
            >
              <template #suffix>pt</template>
            </NumberInput>
          </div>
        </div>
      </div>

      <Divider :margin="10" />

      <!-- Bullets & Lists Disclosure Row (Screenshot 2: "› Bullets & Lists") -->
      <div class="disclosure-section">
        <div class="disclosure-header" @click="bulletsOpen = !bulletsOpen">
          <div class="disclosure-title">
            <i-icon-park-outline:right class="disclosure-arrow" :class="{ open: bulletsOpen }" />
            <span>Bullets &amp; Lists</span>
          </div>
          <div class="disclosure-summary" @click.stop>
            <Select
              style="width: 110px;"
              :value="currentListStyle"
              @update:value="val => applyListStyle(val as string)"
              :options="[
                { label: 'None', value: 'none' },
                { label: 'Bullet', value: 'bullet' },
                { label: 'Numbered', value: 'numbered' },
              ]"
            />
          </div>
        </div>
        <div class="disclosure-body" v-if="bulletsOpen">
          <div class="sub-row">
            <span class="sub-label">List Preset:</span>
            <Select
              style="width: 55%;"
              :value="currentListStyle"
              @update:value="val => applyListStyle(val as string)"
              :options="[
                { label: 'None', value: 'none' },
                { label: 'Standard Bullet', value: 'bullet' },
                { label: 'Numbered 1, 2, 3', value: 'numbered' },
              ]"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- LAYOUT SUB-TAB -->
    <div class="tab-body" v-else>
      <div class="section-title">Margins &amp; Columns</div>
      <div class="control-row label-value-row">
        <span class="row-label">Columns</span>
        <NumberInput
          style="width: 45%;"
          :value="1"
          :min="1"
          :max="4"
          :step="1"
        />
      </div>

      <Divider :margin="10" />
      <div class="section-title">Text Insets (Padding)</div>

      <div class="inset-grid">
        <div class="inset-cell">
          <span class="cell-label">Top</span>
          <NumberInput
            :value="inset[0]"
            :min="0"
            :max="100"
            :step="2"
            @update:value="val => updateInset(0, val)"
          >
            <template #suffix>pt</template>
          </NumberInput>
        </div>
        <div class="inset-cell">
          <span class="cell-label">Bottom</span>
          <NumberInput
            :value="inset[2]"
            :min="0"
            :max="100"
            :step="2"
            @update:value="val => updateInset(2, val)"
          >
            <template #suffix>pt</template>
          </NumberInput>
        </div>
        <div class="inset-cell">
          <span class="cell-label">Left</span>
          <NumberInput
            :value="inset[3]"
            :min="0"
            :max="100"
            :step="2"
            @update:value="val => updateInset(3, val)"
          >
            <template #suffix>pt</template>
          </NumberInput>
        </div>
        <div class="inset-cell">
          <span class="cell-label">Right</span>
          <NumberInput
            :value="inset[1]"
            :min="0"
            :max="100"
            :step="2"
            @update:value="val => updateInset(1, val)"
          >
            <template #suffix>pt</template>
          </NumberInput>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { PPTTextElement, PPTElement } from '@/types/slides'
import { FONTS } from '@/configs/font'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import emitter, { EmitterEvents } from '@/utils/emitter'

import Tabs from '@/components/Tabs.vue'
import Select from '@/components/Select.vue'
import NumberInput from '@/components/NumberInput.vue'
import Popover from '@/components/Popover.vue'
import ColorButton from '@/components/ColorButton.vue'
import ColorPicker from '@/components/ColorPicker/index.vue'
import Divider from '@/components/Divider.vue'
import { t } from '@/i18n'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { richTextAttrs, handleElementId } = storeToRefs(mainStore)

const subTab = ref<'style' | 'layout'>('style')
const characterStyle = ref('none')
const spacingOpen = ref(false)
const bulletsOpen = ref(false)

const handleElement = computed<PPTTextElement | null>(() => {
  if (!handleElementId.value) return null
  const el = mainStore.handleElement
  if (el && (el.type === 'text' || el.type === 'shape')) return el as PPTTextElement
  return null
})

const currentStyleName = computed(() => {
  const fs = parseInt(richTextAttrs.value.fontsize) || 36
  if (fs >= 64) return 'Title'
  if (fs >= 40) return 'Subtitle'
  if (fs >= 24) return 'Body'
  if (fs >= 18) return 'Caption'
  return 'Body'
})

const paragraphStyles = [
  { label: 'Title', previewStyle: { fontSize: '20px', fontWeight: '700' }, size: '80px', weight: '700' },
  { label: 'Subtitle', previewStyle: { fontSize: '16px', fontWeight: '600' }, size: '44px', weight: '600' },
  { label: 'Body', previewStyle: { fontSize: '13px', fontWeight: '400' }, size: '24px', weight: '400' },
  { label: 'Bullet', previewStyle: { fontSize: '13px', fontWeight: '400' }, size: '22px', weight: '400' },
  { label: 'Caption', previewStyle: { fontSize: '11px', color: '#86868b' }, size: '14px', weight: '400' },
]

const { addHistorySnapshot } = useHistorySnapshot()

const emitRichTextCommand = (command: string, value?: string) => {
  emitter.emit(EmitterEvents.RICH_TEXT_COMMAND, { action: { command, value } })
}

const applyParagraphStyle = (style: typeof paragraphStyles[0]) => {
  emitRichTextCommand('fontsize', style.size)
  emitRichTextCommand('bold', style.weight === '700' ? 'true' : '')
}

const currentFontWeight = computed(() => {
  if (richTextAttrs.value.bold) return 'Bold'
  return 'Regular'
})

const fontWeightOptions = [
  { label: 'Regular', value: 'Regular' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Bold', value: 'Bold' },
]

const applyFontWeight = (val: string) => {
  if (val === 'Bold') emitRichTextCommand('bold')
  else if (richTextAttrs.value.bold) emitRichTextCommand('bold')
}

const verticalAlign = computed(() => {
  const vAlign = (handleElement.value as any)?.vAlign
  if (vAlign === 'top') return 'top'
  if (vAlign === 'bottom') return 'bottom'
  return 'center'
})

const updateVerticalAlign = (vAlign: 'top' | 'center' | 'bottom') => {
  if (!handleElementId.value) return
  slidesStore.updateElement({ id: handleElementId.value, props: { vAlign: vAlign as any } })
  addHistorySnapshot()
}

const lineHeight = computed(() => handleElement.value?.lineHeight || 1.2)
const paragraphSpace = computed(() => handleElement.value?.paragraphSpace || 0)
const wordSpace = computed(() => handleElement.value?.wordSpace || 0)
const inset = computed(() => handleElement.value?.inset || [6, 10, 6, 10])

const updateText = (props: Partial<PPTTextElement>) => {
  if (!handleElementId.value) return
  slidesStore.updateElement({ id: handleElementId.value, props })
  addHistorySnapshot()
}

const updateInset = (index: number, val: number) => {
  const current = [...(inset.value || [6, 10, 6, 10])]
  current[index] = val
  updateText({ inset: current as [number, number, number, number] })
}

const currentListStyle = computed(() => {
  if (richTextAttrs.value.bulletList) return 'bullet'
  if (richTextAttrs.value.orderedList) return 'numbered'
  return 'none'
})

const applyListStyle = (style: string) => {
  if (style === 'bullet') emitRichTextCommand('bulletList')
  else if (style === 'numbered') emitRichTextCommand('orderedList')
  else emitRichTextCommand('clearList')
}
</script>

<style lang="scss" scoped>
.keynote-text-tab {
  user-select: none;
  font-size: var(--text-sm);
  color: var(--text-primary, #1d1d1f);
}

.paragraph-style-card {
  margin-bottom: 12px;

  .style-trigger {
    width: 100%;
    height: 48px;
    background: var(--bg-card, var(--bg-control, #ffffff));
    border: 1px solid transparent;
    border-radius: var(--radius-menu);
    padding: 0 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: var(--accent-color, rgba(0, 0, 0, 0.2));
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    .style-name {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: var(--text-primary, #1d1d1f);
    }

    .chevron {
      color: var(--text-tertiary, #86868b);
      font-size: var(--text-lg);
    }
  }
}

.paragraph-styles-menu {
  width: 200px;
  padding: 4px;
  background: var(--popover-bg, #ffffff);
  color: var(--text-primary, #1d1d1f);

  .style-menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-radius: var(--radius-control);
    cursor: pointer;
    color: var(--text-primary, #1d1d1f);
    transition: background-color 0.1s;

    &:hover {
      background-color: var(--bg-hover, rgba(128, 128, 128, 0.12));
    }

    &.active {
      color: var(--accent-color, #007aff);
    }

    .check-icon {
      font-size: var(--text-lg);
      color: var(--accent-color, #007aff);
    }
  }
}

.secondary-tabs-wrapper {
  margin-bottom: 12px;
}

.section-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary, #1d1d1f);
  margin-bottom: 6px;
}

.control-row {
  margin-bottom: 8px;

  &.multi-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &.label-value-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;

    .row-label {
      font-size: var(--text-sm);
      color: var(--text-primary, #1d1d1f);
      font-weight: 500;
    }
  }
}

.segmented-style-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  .style-pills {
    flex: 1;
    display: flex;
    background-color: var(--bg-control, #e9e9eb);
    border-radius: var(--radius-control);
    padding: 2px;
    gap: 2px;
    height: 28px;

    .pill-btn {
      flex: 1;
      border: 0;
      background: transparent;
      border-radius: var(--radius-control);
      font-size: var(--text-sm);
      color: var(--text-primary, #1d1d1f);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.12s;

      &:hover:not(.active) {
        background-color: rgba(0, 0, 0, 0.05);
      }

      &.active {
        background-color: var(--accent-color, #007aff);
        color: #ffffff;
        font-weight: 600;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
      }
    }
  }

  .gear-btn {
    width: 32px;
    height: 28px;
    background: var(--bg-control, #e9e9eb);
    border: 0;
    border-radius: var(--radius-control);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--text-primary, #1d1d1f);
    cursor: pointer;
    font-size: var(--text-md);

    &:hover {
      background-color: var(--bg-control-active, #dfdfe2);
    }

    .micro-chevron {
      font-size: var(--text-xs);
      color: var(--text-tertiary, #86868b);
    }
  }
}

.gear-menu {
  width: 220px;
  padding: 10px;
  background: var(--popover-bg, #ffffff);
  color: var(--text-primary, #1d1d1f);

  .gear-title {
    font-weight: 600;
    font-size: var(--text-sm);
    margin-bottom: 8px;
  }
  .gear-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: var(--text-sm);
  }
  .script-pills {
    display: flex;
    gap: 4px;

    .small-pill {
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid transparent;
      background: var(--bg-control, #f5f5f7);
      font-size: var(--text-xs);
      cursor: pointer;

      &.active {
        background: var(--accent-color, #007aff);
        color: #fff;
      }
    }
  }
}

.alignment-capsules {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  background-color: var(--bg-control, #e9e9eb);
  padding: 2px;
  border-radius: var(--radius-control);
  height: 30px;

  .align-group {
    display: flex;
    align-items: center;
    gap: 1px;

    & + .align-group {
      position: relative;
      &::before {
        content: '';
        display: block;
        width: 1px;
        height: 14px;
        background-color: var(--border-divider, rgba(0, 0, 0, 0.12));
        margin: 0 3px;
      }
    }
  }

  .align-btn {
    width: 24px;
    height: 26px;
    border: 0;
    background: transparent;
    border-radius: var(--radius-control);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary, #1d1d1f);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all 0.1s;

    &:hover:not(.active) {
      background-color: rgba(0, 0, 0, 0.06);
    }

    &.active {
      background-color: var(--accent-color, #007aff);
      color: #ffffff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14);
    }
  }
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

.inset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  .inset-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .cell-label {
      font-size: var(--text-xs);
      color: var(--text-tertiary, #86868b);
    }
  }
}
</style>
