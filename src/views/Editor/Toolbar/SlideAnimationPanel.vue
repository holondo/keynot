<template>
  <div class="slide-animation-panel">
    <div class="panel-section-header">
      <div class="header-title-wrap">
        <i-icon-park-outline:switch class="header-icon" />
        <span class="header-title">Slide Transition</span>
      </div>
      <span class="active-badge">{{ currentAnimationLabel }}</span>
    </div>

    <div class="animation-pool">
      <div 
        class="animation-item" 
        :class="{ 'active': currentTurningMode === item.value }" 
        v-for="item in animations" 
        :key="item.label"
        @click="updateTurningMode(item.value)"
      >
        <div :class="['animation-block', item.value]">
          <svg v-if="item.value === 'no'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="anim-svg">
            <circle cx="12" cy="12" r="8" opacity="0.4" />
            <line x1="6" y1="6" x2="18" y2="18" stroke-linecap="round" />
          </svg>
          <span v-else-if="item.value === 'magicMove'" class="magic-sparkle">✦</span>
          <svg v-else-if="item.value === 'fade'" viewBox="0 0 24 24" fill="currentColor" class="anim-svg">
            <rect x="4" y="5" width="10" height="10" rx="2" opacity="0.4" />
            <rect x="10" y="9" width="10" height="10" rx="2" opacity="0.9" />
          </svg>
          <svg v-else-if="item.value === 'slideX'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="anim-svg">
            <rect x="3" y="6" width="10" height="12" rx="2" opacity="0.4" />
            <path d="M11 12h9m-3-3l3 3-3 3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="item.value === 'slideY'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="anim-svg">
            <rect x="6" y="3" width="12" height="10" rx="2" opacity="0.4" />
            <path d="M12 11v9m-3-3l3 3 3-3" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="item.value === 'slideX3D'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="anim-svg">
            <path d="M12 2L4 6.5V17.5L12 22L20 17.5V6.5L12 2Z" stroke-linejoin="round" />
            <path d="M12 22V12M12 12L20 6.5M12 12L4 6.5" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="item.value === 'slideY3D'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="anim-svg">
            <path d="M2 12L6.5 4H17.5L22 12L17.5 20H6.5L2 12Z" stroke-linejoin="round" />
            <path d="M22 12H12M12 12L6.5 4M12 12L6.5 20" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="item.value === 'rotate'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="anim-svg">
            <path d="M4 12a8 8 0 0 1 14.93-4M20 12a8 8 0 0 1-14.93 4" stroke-linecap="round" />
            <path d="M20 7v4h-4M4 17v-4h4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="item.value === 'scaleY'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="anim-svg">
            <rect x="5" y="8" width="14" height="8" rx="2" opacity="0.4" />
            <path d="M12 8V3m-2 2l2-2 2 2M12 16v5m-2-2l2 2 2-2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="item.value === 'scaleX'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="anim-svg">
            <rect x="8" y="5" width="8" height="14" rx="2" opacity="0.4" />
            <path d="M8 12H3m2-2l-2 2 2 2M16 12h5m-2-2l2 2-2 2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else-if="item.value === 'scale'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="anim-svg">
            <circle cx="10" cy="10" r="6" />
            <path d="M10 7v6M7 10h6M21 21l-5.5-5.5" stroke-linecap="round" />
          </svg>
          <svg v-else-if="item.value === 'scaleReverse'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="anim-svg">
            <circle cx="10" cy="10" r="6" />
            <path d="M7 10h6M21 21l-5.5-5.5" stroke-linecap="round" />
          </svg>
          <svg v-else-if="item.value === 'random'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="anim-svg">
            <path d="M18 4l3 3-3 3M18 20l3-3-3-3" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M3 7h3a5 5 0 0 1 4 2l4 6a5 5 0 0 0 4 2h3M3 17h3a5 5 0 0 0 4-2l4-6a5 5 0 0 1 4-2h3" stroke-linecap="round" />
          </svg>
        </div>
        <div class="animation-text">{{ item.label }}</div>
        <div class="active-check" v-if="currentTurningMode === item.value">
          <i-icon-park-outline:check />
        </div>
      </div>
    </div>

    <Button class="apply-all-btn" @click="applyAllSlide()">
      <i-icon-park-outline:check /> Apply Transition to All Slides
    </Button>

    <div class="magic-move-inspector" v-if="currentTurningMode === 'magicMove'">
      <Divider :margin="12" />
      <div class="inspector-header">
        <span class="inspector-title">Object Transition Inspector</span>
        <span class="inspector-badge">{{ matchAnalysis.matchedPairs.length }} Matched</span>
      </div>

      <div class="config-row">
        <div class="config-label">Duration (ms):</div>
        <NumberInput
          :min="200"
          :max="5000"
          :step="100"
          :value="transitionConfig.duration"
          @update:value="val => updateTransitionConfig({ duration: val })"
          style="width: 60%;"
        />
      </div>

      <div class="config-row">
        <div class="config-label">Timing Curve:</div>
        <Select
          :value="transitionConfig.easing"
          @update:value="val => updateTransitionConfig({ easing: val as string })"
          style="width: 60%;"
          :options="[
            { label: 'Spring Out (Keynote Default)', value: 'cubic-bezier(0.22, 1, 0.36, 1)' },
            { label: 'Smooth Ease In-Out', value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
            { label: 'Dramatic Overshoot', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
            { label: 'Linear', value: 'linear' },
          ]"
        />
      </div>

      <div class="config-row">
        <div class="config-label">Unmatched Objects:</div>
        <Select
          :value="transitionConfig.unmatchedBehavior"
          @update:value="val => updateTransitionConfig({ unmatchedBehavior: val as UnmatchedTransitionBehavior })"
          style="width: 60%;"
          :options="[
            { label: 'Dissolve In / Out', value: 'fade' },
            { label: 'Instant Cut', value: 'instant' },
          ]"
        />
      </div>

      <Button
        type="primary"
        style="width: 100%; margin: 10px 0;"
        :disabled="!previousSlide"
        @click="previewTransitionOnCanvas()"
      >
        <i-icon-park-outline:play-one /> Preview Transition from Previous Slide
      </Button>

      <div v-if="!previousSlide" class="empty-hint">
        This is Slide 1. Object Transition morphs objects from the preceding slide into this slide.
      </div>

      <template v-else>
        <div class="section-subtitle">Matched Object Pairs (Slide {{ slideIndex }} → Slide {{ slideIndex + 1 }})</div>
        <div v-if="!matchAnalysis.matchedPairs.length" class="empty-hint">
          No matched objects yet. Duplicate a slide or link an object below to morph it across slides.
        </div>
        <div class="pair-list" v-else>
          <div
            class="pair-item"
            v-for="pair in matchAnalysis.matchedPairs"
            :key="pair.toElement.id"
            @click="selectElement(pair.toElement.id)"
          >
            <div class="pair-info">
              <div class="pair-names">
                <strong>{{ getElementDisplayLabel(pair.fromElement) }}</strong>
                <span class="arrow">→</span>
                <strong>{{ getElementDisplayLabel(pair.toElement) }}</strong>
              </div>
              <div class="pair-meta">
                <span class="reason-tag">{{ pair.matchReason }}</span>
                <span>Δx {{ Math.round(-pair.deltas.dx) }}px, Δy {{ Math.round(-pair.deltas.dy) }}px</span>
              </div>
            </div>
            <Button
              size="small"
              v-tooltip="'Unlink continuity match'"
              @click.stop="unlinkElementContinuity(pair.toElement.id)"
            >
              Unlink
            </Button>
          </div>
        </div>

        <template v-if="matchAnalysis.unmatchedIncoming.length && previousSlide?.elements?.length">
          <div class="section-subtitle" style="margin-top: 12px;">Link Unmatched Object on Current Slide</div>
          <div
            class="unmatched-item"
            v-for="el in matchAnalysis.unmatchedIncoming"
            :key="el.id"
          >
            <div class="unmatched-name" @click="selectElement(el.id)">
              {{ getElementDisplayLabel(el) }}
            </div>
            <Select
              :value="''"
              @update:value="prevElId => linkElementToPreviousSlide(el.id, prevElId as string)"
              style="width: 55%;"
              :options="previousSlideElementOptions"
            />
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { useSlidesStore } from '@/store'
import type { SlideTransitionConfig, TurningMode, UnmatchedTransitionBehavior } from '@/types/slides'
import { SLIDE_ANIMATIONS } from '@/configs/animation'
import {
  analyzeSlideTransitionMatches,
  DEFAULT_TRANSITION_CONFIG,
  getElementDisplayLabel,
  runMagicMoveTransition,
} from '@/utils/magicMove'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useSelectElement from '@/hooks/useSelectElement'
import message from '@/utils/message'
import Button from '@/components/Button.vue'
import Divider from '@/components/Divider.vue'
import NumberInput from '@/components/NumberInput.vue'
import Select from '@/components/Select.vue'

const slidesStore = useSlidesStore()
const { slides, currentSlide, slideIndex } = storeToRefs(slidesStore)

const currentTurningMode = computed(() => currentSlide.value?.turningMode || 'slideY')
const previousSlide = computed(() => (slideIndex.value > 0 ? slides.value[slideIndex.value - 1] : undefined))

const transitionConfig = computed<Required<SlideTransitionConfig>>(() => ({
  ...DEFAULT_TRANSITION_CONFIG,
  ...(currentSlide.value?.transitionConfig || {}),
}))

const matchAnalysis = computed(() => analyzeSlideTransitionMatches(previousSlide.value, currentSlide.value))

const previousSlideElementOptions = computed(() => {
  if (!previousSlide.value || !previousSlide.value.elements) return []
  return [
    { label: 'Link to Slide ' + slideIndex.value + ' object...', value: '' },
    ...previousSlide.value.elements.map((el, idx) => ({
      label: getElementDisplayLabel(el, idx),
      value: el.id,
    })),
  ]
})

const animations = SLIDE_ANIMATIONS

const currentAnimationLabel = computed(() => {
  const item = animations.find(a => a.value === currentTurningMode.value)
  return item ? item.label : 'None'
})

const { addHistorySnapshot } = useHistorySnapshot()
const { selectElement } = useSelectElement()

const updateTurningMode = (mode: TurningMode) => {
  if (mode === currentTurningMode.value) return
  slidesStore.updateSlide({
    turningMode: mode,
    transitionConfig: mode === 'magicMove' ? transitionConfig.value : currentSlide.value.transitionConfig,
  })
  addHistorySnapshot()
}

const updateTransitionConfig = (patch: Partial<SlideTransitionConfig>) => {
  slidesStore.updateSlide({
    transitionConfig: {
      ...transitionConfig.value,
      ...patch,
    },
  })
  addHistorySnapshot()
}

const applyAllSlide = () => {
  const newSlides = slides.value.map(slide => {
    return {
      ...slide,
      turningMode: currentSlide.value.turningMode,
      transitionConfig: currentSlide.value.transitionConfig,
    }
  })
  slidesStore.setSlides(newSlides)
  message.success('Applied transition to all slides')
  addHistorySnapshot()
}

const previewTransitionOnCanvas = () => {
  if (!previousSlide.value) {
    message.info('Select Slide 2 or later to preview Object Transition')
    return
  }
  const anims = runMagicMoveTransition(previousSlide.value, currentSlide.value, { mode: 'editor' })
  if (!anims.length) {
    message.info('No matched or incoming elements to animate on this slide')
  }
}

const unlinkElementContinuity = (elementId: string) => {
  slidesStore.updateElement({
    id: elementId,
    props: {
      continuityId: `unlinked-${nanoid(8)}`,
    },
  })
  addHistorySnapshot()
  message.success('Unlinked object from previous slide')
}

const linkElementToPreviousSlide = (currentElId: string, prevElId: string) => {
  if (!prevElId || !previousSlide.value) return
  const prevEl = previousSlide.value.elements.find(item => item.id === prevElId)
  if (!prevEl) return

  const sharedContinuityId = prevEl.continuityId || prevEl.id
  if (!prevEl.continuityId) {
    slidesStore.updateElement({
      id: prevEl.id,
      slideId: previousSlide.value.id,
      props: { continuityId: sharedContinuityId },
    })
  }
  slidesStore.updateElement({
    id: currentElId,
    props: { continuityId: sharedContinuityId },
  })
  addHistorySnapshot()
  message.success('Linked object pair for Object Transition')
}
</script>

<style lang="scss" scoped>
.slide-animation-panel {
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.panel-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 2px;

  .header-title-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary, #1d1d1f);

    .header-icon {
      font-size: 14px;
      color: var(--accent-color, #007aff);
    }
  }

  .active-badge {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--accent-color, #007aff);
    background: rgba(0, 122, 255, 0.1);
    padding: 2px 8px;
    border-radius: 9999px;
  }
}

.animation-pool {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.animation-item {
  height: 84px;
  background-color: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 8px 6px;
  position: relative;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;

  &:hover:not(.active) {
    background-color: var(--bg-hover, rgba(0, 0, 0, 0.03));
    border-color: var(--border-color-active, rgba(0, 122, 255, 0.35));
    transform: translateY(-1px);
  }

  &.active {
    border-color: var(--accent-color, #007aff);
    background-color: var(--bg-control-active, #ffffff);
    box-shadow: 0 0 0 1px var(--accent-color, #007aff), 0 2px 8px rgba(0, 122, 255, 0.15);
    z-index: 1;

    .animation-text {
      color: var(--accent-color, #007aff);
      font-weight: 600;
    }

    .animation-block {
      background: rgba(0, 122, 255, 0.12);
      color: var(--accent-color, #007aff);
    }
  }
}

.animation-block {
  width: 52px;
  height: 30px;
  background: var(--bg-control, rgba(0, 0, 0, 0.05));
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  color: var(--text-secondary, #515154);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 6px;
  transition: all 0.15s ease;

  .anim-svg {
    width: 18px;
    height: 18px;
    overflow: visible;
  }

  .magic-sparkle {
    font-size: 16px;
  }

  &.magicMove {
    background: linear-gradient(135deg, #007aff, #af52de);
    color: #ffffff;
    box-shadow: 0 2px 6px rgba(175, 82, 222, 0.3);
  }

  @mixin elAnimation($animationType) {
    content: 'Slide';
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background-color: var(--accent-color, #007aff);
    color: #ffffff;
    font-size: 10.5px;
    font-weight: 600;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: $animationType $transitionDelaySlow linear;
  }

  &.magicMove:hover { &::after { @include elAnimation(scale); } }
  &.fade:hover { &::after { @include elAnimation(fade); } }
  &.slideX:hover { &::after { @include elAnimation(slideX); } }
  &.slideY:hover { &::after { @include elAnimation(slideY); } }
  &.slideX3D:hover { &::after { @include elAnimation(slideX3D); } }
  &.slideY3D:hover { &::after { @include elAnimation(slideY3D); } }
  &.rotate:hover { &::after { transform-origin: 0 0; @include elAnimation(rotate); } }
  &.scaleY:hover { &::after { @include elAnimation(scaleY); } }
  &.scaleX:hover { &::after { @include elAnimation(scaleX); } }
  &.scale:hover { &::after { @include elAnimation(scale); } }
  &.scaleReverse:hover { &::after { @include elAnimation(scaleReverse); } }
}

.animation-text {
  font-size: 11px;
  color: var(--text-primary, #1d1d1f);
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 105px;
}

.active-check {
  position: absolute;
  top: 4px;
  right: 5px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-color, #007aff);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
}

.apply-all-btn {
  width: 100%;
  height: 28px;
  font-size: 11.5px;
  margin-bottom: 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.magic-move-inspector {
  font-size: 12px;
  color: var(--text-primary, #1d1d1f);
}

.inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;

  .inspector-title {
    font-weight: 700;
    font-size: 12.5px;
    color: var(--text-primary, #1d1d1f);
  }
  .inspector-badge {
    background: rgba(0, 122, 255, 0.15);
    color: var(--accent-color, #007aff);
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 11px;
  }
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  .config-label {
    width: 42%;
    color: var(--text-secondary, #515154);
    font-size: 11.5px;
  }
}

.section-subtitle {
  font-weight: 600;
  color: var(--text-primary, #1d1d1f);
  font-size: 11.5px;
  margin: 10px 0 6px;
}

.empty-hint {
  background: var(--bg-control, rgba(0, 0, 0, 0.04));
  border: 1px dashed var(--border-color, rgba(0, 0, 0, 0.12));
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--text-tertiary, #86868b);
  line-height: 1.4;
  font-size: 11px;
}

.pair-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pair-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: 6px;
  background: var(--bg-card, #ffffff);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--accent-color, #007aff);
  }
}

.pair-info {
  flex: 1;
  min-width: 0;
  margin-right: 6px;

  .pair-names {
    font-size: 11.5px;
    color: var(--text-primary, #1d1d1f);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    .arrow {
      margin: 0 4px;
      color: var(--accent-color, #007aff);
    }
  }
  .pair-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
    font-size: 10.5px;
    color: var(--text-tertiary, #86868b);

    .reason-tag {
      background: rgba(0, 122, 255, 0.12);
      color: var(--accent-color, #007aff);
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 500;
    }
  }
}

.unmatched-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;

  .unmatched-name {
    width: 43%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    font-size: 11px;
    color: var(--text-secondary, #515154);

    &:hover {
      color: var(--accent-color, #007aff);
    }
  }
}

@keyframes fade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes slideX {
  0% { transform: translateX(100%); }
  100% { transform: translateX(0); }
}
@keyframes slideY {
  0% { transform: translateY(100%); }
  100% { transform: translateY(0); }
}
@keyframes slideX3D {
  0% { transform: translateX(100%) scale(.5); }
  100% { transform: translateX(0); }
}
@keyframes slideY3D {
  0% { transform: translateY(100%) scale(.5); }
  100% { transform: translateY(0); }
}
@keyframes rotate {
  0% { transform: rotate(-90deg); }
  100% { transform: rotate(0); }
}
@keyframes scaleY {
  0% { transform: scaleY(.1); }
  100% { transform: scaleY(1); }
}
@keyframes scaleX {
  0% { transform: scaleX(.1); }
  100% { transform: scaleX(1); }
}
@keyframes scale {
  0% { transform: scale(.25); }
  100% { transform: scale(1); }
}
@keyframes scaleReverse {
  0% { transform: scale(2); }
  100% { transform: scale(1); }
}
</style>