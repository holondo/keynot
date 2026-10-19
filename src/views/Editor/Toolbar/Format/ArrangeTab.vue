<template>
  <div class="arrange-tab">
    <!-- Layer Order (Move / Object Placement) -->
    <div class="section-title">Object Placement</div>
    <div class="grid-2">
      <Button class="arrange-action-btn" v-tooltip="'Bring to Front (Alt+F)'" @click="handleOrder(ElementOrderCommands.TOP)">
        <i-icon-park-outline:bring-to-front class="btn-icon" /> Front
      </Button>
      <Button class="arrange-action-btn" v-tooltip="'Send to Back (Alt+B)'" @click="handleOrder(ElementOrderCommands.BOTTOM)">
        <i-icon-park-outline:sent-to-back class="btn-icon" /> Back
      </Button>
      <Button class="arrange-action-btn" v-tooltip="'Bring Forward (Ctrl+↑)'" @click="handleOrder(ElementOrderCommands.UP)">
        <i-icon-park-outline:bring-forward class="btn-icon" /> Forward
      </Button>
      <Button class="arrange-action-btn" v-tooltip="'Send Backward (Ctrl+↓)'" @click="handleOrder(ElementOrderCommands.DOWN)">
        <i-icon-park-outline:send-backward class="btn-icon" /> Backward
      </Button>
    </div>

    <Divider :margin="10" />

    <!-- Align & Distribute -->
    <div class="section-title">Align</div>
    <div class="align-cluster">
      <Button class="align-icon-btn" v-tooltip="'Align Left'" @click="handleAlign(ElementAlignCommands.LEFT)">
        <i-icon-park-outline:align-left />
      </Button>
      <Button class="align-icon-btn" v-tooltip="'Center Horizontally'" @click="handleAlign(ElementAlignCommands.HORIZONTAL)">
        <i-icon-park-outline:align-horizontally />
      </Button>
      <Button class="align-icon-btn" v-tooltip="'Align Right'" @click="handleAlign(ElementAlignCommands.RIGHT)">
        <i-icon-park-outline:align-right />
      </Button>
      <Button class="align-icon-btn" v-tooltip="'Align Top'" @click="handleAlign(ElementAlignCommands.TOP)">
        <i-icon-park-outline:align-top />
      </Button>
      <Button class="align-icon-btn" v-tooltip="'Center Vertically'" @click="handleAlign(ElementAlignCommands.VERTICAL)">
        <i-icon-park-outline:align-vertically />
      </Button>
      <Button class="align-icon-btn" v-tooltip="'Align Bottom'" @click="handleAlign(ElementAlignCommands.BOTTOM)">
        <i-icon-park-outline:align-bottom />
      </Button>
    </div>

    <template v-if="displayItemCount > 2">
      <div class="grid-2" style="margin-top: 8px;">
        <Button class="arrange-action-btn" @click="uniformHorizontalDisplay" v-tooltip="'Distribute Horizontally'">
          <i-icon-park-outline:distribute-horizontally class="btn-icon" /> Distribute H
        </Button>
        <Button class="arrange-action-btn" @click="uniformVerticalDisplay" v-tooltip="'Distribute Vertically'">
          <i-icon-park-outline:distribute-vertically class="btn-icon" /> Distribute V
        </Button>
      </div>
    </template>

    <!-- Size & Position (Single Element) -->
    <template v-if="handleElement">
      <template v-if="handleElement.type !== 'line'">
        <Divider :margin="10" />
        <div class="section-title">Size</div>
        <div class="grid-2">
          <NumberInput
            :min="minSize"
            :max="2500"
            :step="5"
            :disabled="isAutoWidthText"
            :value="width"
            @update:value="v => updateWidth(v)"
          >
            <template #prefix>W:</template>
            <template #suffix>pt</template>
          </NumberInput>

          <NumberInput
            :min="minSize"
            :max="2000"
            :step="5"
            :disabled="isAutoHeightText || handleElement.type === 'table'"
            :value="height"
            @update:value="v => updateHeight(v)"
          >
            <template #prefix>H:</template>
            <template #suffix>pt</template>
          </NumberInput>
        </div>

        <div class="checkbox-row" v-if="['image', 'shape', 'audio'].includes(handleElement.type)">
          <Checkbox :value="fixedRatio" @update:value="v => updateFixedRatio(v)">
            Constrain proportions
          </Checkbox>
        </div>
      </template>

      <Divider :margin="10" />
      <div class="section-title">Position</div>
      <div class="grid-2">
        <NumberInput
          :min="-2000"
          :max="4000"
          :step="5"
          :value="left"
          @update:value="v => updateLeft(v)"
        >
          <template #prefix>X:</template>
          <template #suffix>pt</template>
        </NumberInput>
        <NumberInput
          :min="-2000"
          :max="4000"
          :step="5"
          :value="top"
          @update:value="v => updateTop(v)"
        >
          <template #prefix>Y:</template>
          <template #suffix>pt</template>
        </NumberInput>
      </div>

      <template v-if="!['line', 'video', 'audio'].includes(handleElement.type)">
        <Divider :margin="10" />
        <div class="section-title">Rotate &amp; Flip</div>
        <div class="rotate-row">
          <NumberInput
            :min="-180"
            :max="180"
            :step="5"
            :value="rotate"
            @update:value="v => updateRotate(v)"
            style="flex: 1;"
          >
            <template #prefix>Angle:</template>
            <template #suffix>°</template>
          </NumberInput>
          <div class="quick-rotate-group">
            <Button class="quick-rot-btn" v-tooltip="'Rotate -45°'" @click="updateRotate45('-')">-45°</Button>
            <Button class="quick-rot-btn" v-tooltip="'Rotate +45°'" @click="updateRotate45('+')">+45°</Button>
          </div>
        </div>

        <div class="grid-2" style="margin-top: 8px;" v-if="['image', 'shape'].includes(handleElement.type)">
          <Button class="arrange-action-btn" :class="{ active: flipH }" @click="toggleFlip('h')">
            <i-icon-park-outline:flip-horizontally class="btn-icon" /> Flip Horizontal
          </Button>
          <Button class="arrange-action-btn" :class="{ active: flipV }" @click="toggleFlip('v')">
            <i-icon-park-outline:flip-vertically class="btn-icon" /> Flip Vertical
          </Button>
        </div>
      </template>
    </template>

    <Divider :margin="10" />

    <!-- Group & Lock -->
    <div class="section-title">Grouping &amp; Lock</div>
    <div class="grid-2" v-if="activeElementIdList.length > 1 || (handleElement && handleElement.groupId)">
      <Button class="arrange-action-btn" :disabled="!canCombine" @click="combineElements()">
        <i-icon-park-outline:group class="btn-icon" /> Group
      </Button>
      <Button class="arrange-action-btn" :disabled="canCombine" @click="uncombineElements()">
        <i-icon-park-outline:ungroup class="btn-icon" /> Ungroup
      </Button>
    </div>

    <div class="control-row" :style="{ marginTop: (activeElementIdList.length > 1 || (handleElement && handleElement.groupId)) ? '8px' : '0' }">
      <Button class="full-width-btn" :class="{ active: isElementLocked }" @click="handleToggleLock">
        <i-icon-park-outline:unlock class="btn-icon" v-if="isElementLocked" />
        <i-icon-park-outline:lock class="btn-icon" v-else />
        <span>{{ isElementLocked ? 'Unlock Object' : 'Lock Object' }}</span>
      </Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { round } from 'lodash'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { ElementAlignCommands, ElementOrderCommands } from '@/types/edit'
import { MIN_SIZE } from '@/configs/element'
import { SHAPE_PATH_FORMULAS } from '@/configs/shapes'
import useOrderElement from '@/hooks/useOrderElement'
import useAlignElementToCanvas from '@/hooks/useAlignElementToCanvas'
import useAlignActiveElement from '@/hooks/useAlignActiveElement'
import useCombineElement from '@/hooks/useCombineElement'
import useUniformDisplayElement from '@/hooks/useUniformDisplayElement'
import useLockElement from '@/hooks/useLockElement'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import Divider from '@/components/Divider.vue'
import Button from '@/components/Button.vue'
import NumberInput from '@/components/NumberInput.vue'
import Checkbox from '@/components/Checkbox.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { handleElement, handleElementId, activeElementIdList } = storeToRefs(mainStore)

const left = ref(0)
const top = ref(0)
const width = ref(0)
const height = ref(0)
const rotate = ref(0)
const fixedRatio = ref(false)
const flipH = ref(false)
const flipV = ref(false)

const minSize = computed(() => {
  if (!handleElement.value) return 20
  return MIN_SIZE[handleElement.value.type] || 20
})

const isAutoHeightText = computed(() => {
  return handleElement.value?.type === 'text' && !handleElement.value.vertical && !handleElement.value.fixedHeight
})
const isAutoWidthText = computed(() => {
  return handleElement.value?.type === 'text' && handleElement.value.vertical && !handleElement.value.fixedHeight
})

watch(handleElement, () => {
  if (!handleElement.value) return

  left.value = round(handleElement.value.left, 1)
  top.value = round(handleElement.value.top, 1)
  fixedRatio.value = 'fixedRatio' in handleElement.value && !!handleElement.value.fixedRatio

  if (handleElement.value.type !== 'line') {
    width.value = round(handleElement.value.width, 1)
    height.value = round(handleElement.value.height, 1)
    rotate.value = 'rotate' in handleElement.value && handleElement.value.rotate !== undefined ? round(handleElement.value.rotate, 1) : 0
  }

  if (['image', 'shape'].includes(handleElement.value.type)) {
    flipH.value = !!(handleElement.value as any).flipH
    flipV.value = !!(handleElement.value as any).flipV
  }
}, { deep: true, immediate: true })

const { orderElement } = useOrderElement()
const { alignElementToCanvas } = useAlignElementToCanvas()
const { alignActiveElement } = useAlignActiveElement()
const { canCombine, combineElements, uncombineElements } = useCombineElement()
const { displayItemCount, uniformHorizontalDisplay, uniformVerticalDisplay } = useUniformDisplayElement()
const { lockElement, unlockElement } = useLockElement()
const { addHistorySnapshot } = useHistorySnapshot()

const isElementLocked = computed(() => {
  if (handleElement.value?.lock) return true
  if (activeElementIdList.value.length) {
    const currentElements = slidesStore.currentSlide.elements
    return activeElementIdList.value.every(id => currentElements.find(el => el.id === id)?.lock)
  }
  return false
})

const handleToggleLock = () => {
  if (isElementLocked.value) {
    if (handleElement.value) unlockElement(handleElement.value)
  } else {
    lockElement()
  }
}

const handleOrder = (cmd: ElementOrderCommands) => {
  if (handleElement.value) orderElement(handleElement.value, cmd)
}

const handleAlign = (cmd: ElementAlignCommands) => {
  if (activeElementIdList.value.length > 1 && canCombine.value) {
    alignActiveElement(cmd)
  } else {
    alignElementToCanvas(cmd)
  }
}

const updateLeft = (v: number) => {
  if (!handleElementId.value) return
  slidesStore.updateElement({ id: handleElementId.value, props: { left: v } })
  addHistorySnapshot()
}

const updateTop = (v: number) => {
  if (!handleElementId.value) return
  slidesStore.updateElement({ id: handleElementId.value, props: { top: v } })
  addHistorySnapshot()
}

const updateShapePathData = (w: number, h: number) => {
  if (handleElement.value && handleElement.value.type === 'shape' && 'pathFormula' in handleElement.value && handleElement.value.pathFormula) {
    const pathFormula = SHAPE_PATH_FORMULAS[handleElement.value.pathFormula]
    let path = ''
    if ('editable' in pathFormula && pathFormula.editable) path = pathFormula.formula(w, h, handleElement.value.keypoints!)
    else path = pathFormula.formula(w, h)
    return { viewBox: [w, h], path }
  }
  return null
}

const updateWidth = (w: number) => {
  if (!handleElement.value) return
  let props: any = { width: w }
  if (fixedRatio.value && height.value && width.value) {
    const newH = round(w * (height.value / width.value), 1)
    props.height = newH
  }
  const shapePath = updateShapePathData(props.width, props.height || height.value)
  if (shapePath) props = { ...props, ...shapePath }
  slidesStore.updateElement({ id: handleElementId.value, props })
  addHistorySnapshot()
}

const updateHeight = (h: number) => {
  if (!handleElement.value) return
  let props: any = { height: h }
  if (fixedRatio.value && width.value && height.value) {
    const newW = round(h * (width.value / height.value), 1)
    props.width = newW
  }
  const shapePath = updateShapePathData(props.width || width.value, props.height)
  if (shapePath) props = { ...props, ...shapePath }
  slidesStore.updateElement({ id: handleElementId.value, props })
  addHistorySnapshot()
}

const updateFixedRatio = (val: boolean) => {
  fixedRatio.value = val
  slidesStore.updateElement({ id: handleElementId.value, props: { fixedRatio: val } })
  addHistorySnapshot()
}

const updateRotate = (rot: number) => {
  slidesStore.updateElement({ id: handleElementId.value, props: { rotate: rot } })
  addHistorySnapshot()
}

const updateRotate45 = (dir: '+' | '-') => {
  const step = dir === '+' ? 45 : -45
  const newRot = (rotate.value + step) % 360
  updateRotate(newRot)
}

const toggleFlip = (type: 'h' | 'v') => {
  if (!handleElement.value) return
  if (type === 'h') {
    slidesStore.updateElement({ id: handleElementId.value, props: { flipH: !flipH.value } })
  } else {
    slidesStore.updateElement({ id: handleElementId.value, props: { flipV: !flipV.value } })
  }
  addHistorySnapshot()
}
</script>

<style lang="scss" scoped>
.arrange-tab {
  font-size: 12px;
  color: var(--text-primary, #1d1d1f);
  user-select: none;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary, #86868b);
  margin-bottom: 8px;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  width: 100%;
}

.arrange-action-btn {
  height: 28px;
  width: 100%;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 8px;
  white-space: nowrap;
  box-sizing: border-box;

  .btn-icon {
    font-size: 14px;
    flex-shrink: 0;
  }
}

.align-cluster {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  width: 100%;
}

.align-icon-btn {
  height: 28px;
  width: 100%;
  border-radius: 6px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.checkbox-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
}

.rotate-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.quick-rotate-group {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.quick-rot-btn {
  height: 28px;
  min-width: 42px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 500;
}

.control-row {
  width: 100%;
}

.full-width-btn {
  width: 100%;
  height: 28px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  .btn-icon {
    font-size: 14px;
  }

  &.active {
    background-color: var(--accent-color, #007aff);
    color: #fff;
    border-color: var(--accent-color, #007aff);
  }
}
</style>
