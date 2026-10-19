<template>
  <div class="element-animation-panel">
    <div class="element-animation" v-if="handleElement">
      <Popover 
        trigger="click" 
        v-model:value="animationPoolVisible" 
        @update:value="visible => handlePopoverVisibleChange(visible)"
        style="width: 100%;"
      >
        <template #content>
          <Tabs 
            :tabs="tabs" 
            v-model:value="activeTab" 
            :tabsStyle="{ marginBottom: '20px' }" 
            :tabStyle="{ width: '25%' }" 
            spaceAround
          />
          <template v-for="key in animationTypes">
            <div :class="['animation-pool', key]" :key="key" v-if="activeTab === key">
              <div class="pool-type" :key="effect.name" v-for="effect in animations[key]">
                <div class="type-title">{{effect.name}}:</div>
                <div class="pool-item-wrapper">
                  <div 
                    class="pool-item" 
                    v-for="item in effect.children" :key="item.name"
                    @mouseenter="hoverPreviewAnimation = item.value"
                    @mouseleave="hoverPreviewAnimation = ''"
                    @click="addAnimation(key, item.value)"
                  >
                    <div 
                      class="animation-box"
                      :class="[
                        `${ANIMATION_CLASS_PREFIX}animated`,
                        `${ANIMATION_CLASS_PREFIX}fast`,
                        hoverPreviewAnimation === item.value && `${ANIMATION_CLASS_PREFIX}${item.value}`,
                      ]"
                    >{{item.name}}</div>
                  </div>
                </div>
              </div>
              <div class="mask" v-if="!popoverMaskHide"></div>
            </div>
          </template>
        </template>
        <Button class="element-animation-btn" @click="handleAnimationId = ''">
          <i-icon-park-outline:effects /> Add Build Effect
        </Button>
      </Popover>
    </div>

    <div class="tip" v-else><i-icon-park-outline:click style="margin-right: 5px;" /> Select an object on canvas to add a Build</div>
    
    <Divider />

    <Draggable 
      class="animation-sequence"
      :modelValue="animationSequence"
      :animation="200"
      :scroll="true"
      :scrollSensitivity="50"
      handle=".sequence-content"
      itemKey="id"
      @end="handleDragEnd"
    >
      <template #item="{ element }">
        <div class="sequence-item" :class="[element.type, { 'active': handleElement?.id === element.elId }]" @click="selectElement(element.elId)">
          <div class="sequence-content">
            <div class="index">{{element.index}}</div>
            <div class="text">[{{element.elType}}] {{element.animationEffect}}</div>
            <div class="handler">
              <i-icon-park-outline:play-one class="handler-btn" v-tooltip="'Preview Build'" @click.stop="runAnimation(element.elId, element.effect, element.duration, element)" />
              <i-icon-park-outline:close-small class="handler-btn" v-tooltip="'Remove Build'" @click.stop="deleteAnimation(element.id)" />
            </div>
          </div>

          <div class="configs" v-if="handleElementAnimation.some(item => item.id === element.id)">
            <Divider :margin="12" />

            <div class="config-item">
              <div style="width: 38%;">Duration (ms):</div>
              <NumberInput 
                :min="100"
                :max="5000"
                :step="100"
                :value="element.duration" 
                @update:value="value => updateElementAnimationDuration(element.id, value)" 
                style="width: 62%;" 
              />
            </div>
            <div class="config-item">
              <div style="width: 38%;">Delay (ms):</div>
              <NumberInput 
                :min="0"
                :max="5000"
                :step="100"
                :value="element.delay || 0" 
                @update:value="value => updateElementAnimationDelay(element.id, value)" 
                style="width: 62%;" 
              />
            </div>
            <div class="config-item">
              <div style="width: 38%;">Start Trigger:</div>
              <Select
                :value="element.trigger"
                @update:value="value => updateElementAnimationTrigger(element.id, value as AnimationTrigger)"
                style="width: 62%;"
                :options="[
                  { label: 'On Click', value: 'click' },
                  { label: 'With Previous', value: 'meantime' },
                  { label: 'After Previous', value: 'auto' },
                ]"
              />
            </div>

            <template v-if="element.type === 'action'">
              <div class="config-item">
                <div style="width: 38%;">Offset ΔX (px):</div>
                <NumberInput
                  :min="-800"
                  :max="800"
                  :step="10"
                  :value="element.actionParams?.dx ?? 60"
                  @update:value="val => updateActionParam(element.id, { dx: val })"
                  style="width: 62%;"
                />
              </div>
              <div class="config-item">
                <div style="width: 38%;">Offset ΔY (px):</div>
                <NumberInput
                  :min="-800"
                  :max="800"
                  :step="10"
                  :value="element.actionParams?.dy ?? 0"
                  @update:value="val => updateActionParam(element.id, { dy: val })"
                  style="width: 62%;"
                />
              </div>
              <div class="config-item">
                <div style="width: 38%;">Scale (×):</div>
                <NumberInput
                  :min="0.1"
                  :max="4"
                  :step="0.1"
                  :value="element.actionParams?.scale ?? 1"
                  @update:value="val => updateActionParam(element.id, { scale: val })"
                  style="width: 62%;"
                />
              </div>
              <div class="config-item">
                <div style="width: 38%;">Rotate (°):</div>
                <NumberInput
                  :min="-360"
                  :max="360"
                  :step="15"
                  :value="element.actionParams?.rotate ?? 0"
                  @update:value="val => updateActionParam(element.id, { rotate: val })"
                  style="width: 62%;"
                />
              </div>
              <div class="config-item">
                <div style="width: 38%;">Target Opacity:</div>
                <NumberInput
                  :min="0"
                  :max="1"
                  :step="0.1"
                  :value="element.actionParams?.opacity ?? 1"
                  @update:value="val => updateActionParam(element.id, { opacity: val })"
                  style="width: 62%;"
                />
              </div>
            </template>

            <div class="config-item" style="margin-top: 8px;">
              <Button style="width: 100%;" @click="openAnimationPool(element.id)"><i-icon-park-outline:switch /> Change Build Effect</Button>
            </div>
          </div>
        </div>
      </template>
    </Draggable>

    <template v-if="animationSequence.length >= 2">
      <Divider />
      <Button @click="runAllAnimation()">
        <i-icon-park-outline:pause v-if="animateIn" /><i-icon-park-outline:play-one v-else /> {{ animateIn ? 'Stop Preview' : 'Preview All Builds'}}
      </Button>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { nanoid } from 'nanoid'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { ActionAnimationParams, AnimationTrigger, AnimationType, PPTAnimation } from '@/types/slides'
import { 
  ENTER_ANIMATIONS,
  EXIT_ANIMATIONS,
  ATTENTION_ANIMATIONS,
  ACTION_ANIMATIONS,
  ANIMATION_DEFAULT_DURATION,
  ANIMATION_DEFAULT_TRIGGER,
  ANIMATION_CLASS_PREFIX,
} from '@/configs/animation'
import { ELEMENT_TYPE_ZH } from '@/configs/element'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useSelectElement from '@/hooks/useSelectElement'

import Tabs from '@/components/Tabs.vue'
import Divider from '@/components/Divider.vue'
import Button from '@/components/Button.vue'
import Draggable from 'vuedraggable'
import NumberInput from '@/components/NumberInput.vue'
import Select from '@/components/Select.vue'
import Popover from '@/components/Popover.vue'

const animationEffects: Record<string, string> = {}
for (const effect of ENTER_ANIMATIONS) {
  for (const animation of effect.children) {
    animationEffects[animation.value] = animation.name
  }
}
for (const effect of EXIT_ANIMATIONS) {
  for (const animation of effect.children) {
    animationEffects[animation.value] = animation.name
  }
}
for (const effect of ATTENTION_ANIMATIONS) {
  for (const animation of effect.children) {
    animationEffects[animation.value] = animation.name
  }
}
for (const effect of ACTION_ANIMATIONS) {
  for (const animation of effect.children) {
    animationEffects[animation.value] = animation.name
  }
}

interface TabItem {
  key: AnimationType
  label: string
  color: string,
}

const animationTypes: AnimationType[] = ['in', 'action', 'attention', 'out']

const slidesStore = useSlidesStore()
const { handleElement, handleElementId } = storeToRefs(useMainStore())
const { currentSlide, formatedAnimations, currentSlideAnimations } = storeToRefs(slidesStore)

const tabs: TabItem[] = [
  { key: 'in', label: 'Build In', color: '#10b981' },
  { key: 'action', label: 'Action', color: '#4f46e5' },
  { key: 'attention', label: 'Emphasis', color: '#f59e0b' },
  { key: 'out', label: 'Build Out', color: '#ef4444' },
]
const activeTab = ref<AnimationType>('in')
const animateIn = ref(false)
watch(() => handleElementId.value, () => {
  animationPoolVisible.value = false
})

const hoverPreviewAnimation = ref('')
const animationPoolVisible = ref(false)

const { addHistorySnapshot } = useHistorySnapshot()
const { selectElement } = useSelectElement()

const animationSequence = computed(() => {
  const animationSequence = []
  for (let i = 0; i < formatedAnimations.value.length; i++) {
    const item = formatedAnimations.value[i]
    for (let j = 0; j < item.animations.length; j++) {
      const animation = item.animations[j]
      const el = currentSlide.value?.elements?.find(el => el.id === animation.elId)
      if (!el) continue

      const elType = ELEMENT_TYPE_ZH[el.type]
      const animationEffect = animationEffects[animation.effect] || animation.effect
      animationSequence.push({
        ...animation,
        index: j === 0 ? i + 1 : '',
        elType,
        animationEffect,
      })
    }
  }
  return animationSequence
})

const handleElementAnimation = computed(() => {
  const animations = currentSlideAnimations.value
  const animation = animations.filter(item => item.elId === handleElementId.value)
  return animation || []
})

const deleteAnimation = (id: string) => {
  const animations = currentSlideAnimations.value.filter(item => item.id !== id)
  slidesStore.updateSlide({ animations })
  addHistorySnapshot()
}

const handleDragEnd = (eventData: { newIndex: number; oldIndex: number }) => {
  const { newIndex, oldIndex } = eventData
  if (newIndex === undefined || oldIndex === undefined || newIndex === oldIndex) return

  const animations: PPTAnimation[] = JSON.parse(JSON.stringify(currentSlideAnimations.value))
  const animation = animations[oldIndex]
  animations.splice(oldIndex, 1)
  animations.splice(newIndex, 0, animation)
  
  slidesStore.updateSlide({ animations })
  addHistorySnapshot()
}

const runAnimation = (elId: string, effect: string, duration: number, animationObj?: PPTAnimation) => {
  const elRef = document.querySelector(`#editable-element-${elId} [class^=editable-element-]`) as HTMLElement | null
  if (!elRef) return

  if (animationObj?.type === 'action' || effect.startsWith('action')) {
    const params = animationObj?.actionParams || {}
    const dx = params.dx ?? (effect === 'actionMove' ? 60 : 0)
    const dy = params.dy ?? 0
    const scale = params.scale ?? (effect === 'actionScale' ? 1.25 : 1)
    const rotate = params.rotate ?? (effect === 'actionRotate' ? 15 : 0)
    const opacity = params.opacity ?? (effect === 'actionOpacity' ? 0.4 : 1)

    elRef.animate(
      [
        { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(${rotate}deg)`, opacity },
        { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1 },
      ],
      {
        duration: duration || 800,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    )
    return
  }

  const animationName = `${ANIMATION_CLASS_PREFIX}${effect}`
  document.documentElement.style.setProperty('--animate-duration', `${duration}ms`)
  elRef.classList.add(`${ANIMATION_CLASS_PREFIX}animated`, animationName)

  const handleAnimationEnd = () => {
    document.documentElement.style.removeProperty('--animate-duration')
    elRef.classList.remove(`${ANIMATION_CLASS_PREFIX}animated`, animationName)
  }
  elRef.addEventListener('animationend', handleAnimationEnd, { once: true })
}

const runAllAnimation = async () => {
  animateIn.value = !animateIn.value
  for (let i = 0; i < animationSequence.value.length; i++) {
    if (!animateIn.value) break
    const item = animationSequence.value[i]
    if (item.index !== 1 && item.trigger !== 'meantime') await new Promise(resolve => setTimeout(resolve, item.duration + 100)) 
    runAnimation(item.elId, item.effect, item.duration, item)
    if (i >= animationSequence.value.length - 1) animateIn.value = false
  }
}

const updateElementAnimationDuration = (id: string, duration: number) => {
  if (duration < 100 || duration > 5000) return

  const animations = currentSlideAnimations.value.map(item => {
    if (item.id === id) return { ...item, duration }
    return item
  })
  slidesStore.updateSlide({ animations })
  addHistorySnapshot()
}

const updateElementAnimationDelay = (id: string, delay: number) => {
  if (delay < 0 || delay > 10000) return

  const animations = currentSlideAnimations.value.map(item => {
    if (item.id === id) return { ...item, delay }
    return item
  })
  slidesStore.updateSlide({ animations })
  addHistorySnapshot()
}

const updateActionParam = (id: string, patch: Partial<ActionAnimationParams>) => {
  const animations = currentSlideAnimations.value.map(item => {
    if (item.id === id) {
      return {
        ...item,
        actionParams: {
          ...(item.actionParams || {}),
          ...patch,
        },
      }
    }
    return item
  })
  slidesStore.updateSlide({ animations })
  addHistorySnapshot()
}

const updateElementAnimationTrigger = (id: string, trigger: AnimationTrigger) => {
  const animations = currentSlideAnimations.value.map(item => {
    if (item.id === id) return { ...item, trigger }
    return item
  })
  slidesStore.updateSlide({ animations })
  addHistorySnapshot()
}

const getDefaultActionParams = (effect: string): ActionAnimationParams => {
  if (effect === 'actionMove') return { dx: 80, dy: 0, scale: 1, rotate: 0, opacity: 1 }
  if (effect === 'actionScale') return { dx: 0, dy: 0, scale: 1.3, rotate: 0, opacity: 1 }
  if (effect === 'actionRotate') return { dx: 0, dy: 0, scale: 1, rotate: 30, opacity: 1 }
  if (effect === 'actionOpacity') return { dx: 0, dy: 0, scale: 1, rotate: 0, opacity: 0.35 }
  return { dx: 40, dy: -20, scale: 1.15, rotate: 10, opacity: 1 }
}

const updateElementAnimation = (type: AnimationType, effect: string) => {
  const animations = currentSlideAnimations.value.map(item => {
    if (item.id === handleAnimationId.value) {
      return {
        ...item,
        type,
        effect,
        actionParams: type === 'action' ? getDefaultActionParams(effect) : item.actionParams,
      }
    }
    return item
  })
  slidesStore.updateSlide({ animations })
  animationPoolVisible.value = false
  addHistorySnapshot()

  const animationItem = currentSlideAnimations.value.find(item => item.elId === handleElementId.value)
  const duration = animationItem?.duration || ANIMATION_DEFAULT_DURATION

  setTimeout(() => {
    runAnimation(handleElementId.value, effect, duration, animationItem)
  }, 0)
}

const handleAnimationId = ref('')
const addAnimation = (type: AnimationType, effect: string) => {
  if (handleAnimationId.value) {
    updateElementAnimation(type, effect)
    return
  }

  const animations: PPTAnimation[] = JSON.parse(JSON.stringify(currentSlideAnimations.value))
  const newAnim: PPTAnimation = {
    id: nanoid(10),
    elId: handleElementId.value,
    type,
    effect,
    duration: ANIMATION_DEFAULT_DURATION,
    delay: 0,
    trigger: ANIMATION_DEFAULT_TRIGGER,
    ...(type === 'action' ? { actionParams: getDefaultActionParams(effect) } : {}),
  }
  animations.push(newAnim)
  slidesStore.updateSlide({ animations })
  animationPoolVisible.value = false
  addHistorySnapshot()

  setTimeout(() => {
    runAnimation(handleElementId.value, effect, ANIMATION_DEFAULT_DURATION, newAnim)
  }, 0)
}

const popoverMaskHide = ref(false)
const handlePopoverVisibleChange = (visible: boolean) => {
  if (visible) {
    setTimeout(() => popoverMaskHide.value = true, 600)
  }
  else popoverMaskHide.value = false
}

const openAnimationPool = (elementId: string) => {
  animationPoolVisible.value = true
  handleAnimationId.value = elementId
  handlePopoverVisibleChange(true)
}

const animations = {
  in: ENTER_ANIMATIONS,
  action: ACTION_ANIMATIONS,
  attention: ATTENTION_ANIMATIONS,
  out: EXIT_ANIMATIONS,
}
</script>

<style lang="scss" scoped>
$inColor: #10b981;
$actionColor: #4f46e5;
$attentionColor: #f59e0b;
$outColor: #ef4444;

.element-animation-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.element-animation {
  height: 32px;
  display: flex;
  align-items: center;
}
.element-animation-btn {
  width: 100%;
}
.config-item {
  display: flex;
  align-items: center;

  & + .config-item {
    margin-top: 5px;
  }
}
.tip {
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-style: italic;
}
.animation-pool {
  width: 400px;
  height: 500px;
  overflow-y: auto;
  overflow-x: hidden;
  font-size: 12px;
  margin-right: -10px;
  padding-right: 5px;
  position: relative;

  .mask {
    @include absolute-0();
  }

  &.in .type-title {
    border-left-color: $inColor;
    background-color: rgba($color: $inColor, $alpha: .15);
  }
  &.action .type-title {
    border-left-color: $actionColor;
    background-color: rgba($color: $actionColor, $alpha: .15);
  }
  &.out .type-title {
    border-left-color: $outColor;
    background-color: rgba($color: $outColor, $alpha: .15);
  }
  &.attention .type-title {
    border-left-color: $attentionColor;
    background-color: rgba($color: $attentionColor, $alpha: .15);
  }
}
.pool-type:not(:last-child) {
  margin-bottom: 5px;
}
.type-title {
  width: 100%;
  font-size: 13px;
  margin-bottom: 10px;
  border-left: 4px solid #aaa;
  background-color: #eee;
  padding: 4px 0 4px 10px;
}
.pool-item-wrapper {
  @include flex-grid-layout();
}
.pool-item {
  @include flex-grid-layout-children(4, 24%);

  margin-bottom: 5px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  cursor: pointer;
}
.animation-box {
  background-color: $lightGray;
  border-radius: $borderRadius;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.animation-sequence {
  flex: 1;
  padding-right: 12px;
  margin-right: -12px;

  @include overflow-overlay();
}
.sequence-item {
  border: 1px solid #38383f;
  background-color: #1c1c20;
  padding: 8px;
  border-radius: $borderRadius;
  margin-bottom: 8px;
  transition: all .5s;

  &.in.active {
    border-color: $inColor;
  }
  &.action.active {
    border-color: $actionColor;
  }
  &.out.active {
    border-color: $outColor;
  }
  &.attention.active {
    border-color: $attentionColor;
  }
  &.active {
    height: auto;
  }

  .sequence-content {
    display: flex;
    align-items: center;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }

    .index {
      flex: 1;
    }
    .text {
      flex: 6;
    }
    .handler {
      flex: 2;
      font-size: 15px;
      text-align: right;
    }
    .handler-btn {
      margin-left: 8px;
      cursor: pointer;
    }
  }
}
</style>