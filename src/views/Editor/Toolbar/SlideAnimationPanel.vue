<template>
  <div class="slide-animation-panel">
    <div class="panel-section-header">
      <div class="header-title-wrap">
        <i-icon-park-outline:switch class="header-icon" />
        <span class="header-title">{{ t('inspector.tabs.transition') }}</span>
      </div>
      <span class="active-badge">{{ label(definition) }}</span>
    </div>

    <div class="effect-summary" v-if="!galleryOpen">
      <div class="effect-name">
        <span>{{ label(definition) }}</span>
        <span class="fidelity" v-if="transition.effect !== 'none' && definition.fidelity === 'approximate'" v-tooltip="t('inspector.transition.approximateHint')">≈</span>
      </div>
      <Button size="small" @click="galleryOpen = true">
        {{ transition.effect === 'none' ? t('inspector.transition.addEffect') : t('inspector.transition.change') }}
      </Button>
    </div>

    <div class="gallery" v-else>
      <template v-for="group in TRANSITION_GROUPS" :key="group.id">
        <div class="group-title" v-if="group.id !== 'none' && group.id !== 'magicMove'">{{ group.label[currentLocale] }}</div>
        <div class="animation-pool">
          <div
            class="animation-item"
            :class="{ active: transition.effect === item.id }"
            v-for="item in TRANSITIONS.filter(effect => effect.group === group.id)"
            :key="item.id"
            :data-effect="item.id"
            @click="chooseEffect(item.id)"
          >
            <span class="animation-text">{{ label(item) }}</span>
            <span class="fidelity" v-if="item.fidelity === 'approximate'">≈</span>
          </div>
        </div>
      </template>
      <Button class="gallery-done" size="small" @click="galleryOpen = false">{{ t('inspector.transition.done') }}</Button>
    </div>

    <template v-if="transition.effect !== 'none' && !galleryOpen">
      <Button class="preview-btn" :disabled="!nextSlide" @click="previewTransition()">
        <i-icon-park-outline:play-one /> {{ t('inspector.transition.preview') }}
      </Button>

      <div class="config-row">
        <div class="config-label">{{ t('inspector.transition.duration') }} (s):</div>
        <NumberInput
          :min="0.1"
          :max="60"
          :step="0.1"
          :value="transition.duration / 1000"
          @update:value="value => update({ duration: Math.round(value * 1000) })"
          style="width: 60%;"
        />
      </div>

      <div class="config-row" v-if="definition.directional">
        <div class="config-label">{{ t('inspector.transition.direction') }}:</div>
        <Select
          :value="transition.direction ?? 12"
          @update:value="value => update({ direction: Number(value) })"
          style="width: 60%;"
          :options="TRANSITION_DIRECTIONS.map(direction => ({ label: direction.label[currentLocale], value: direction.value }))"
        />
      </div>

      <div class="config-row">
        <div class="config-label">{{ t('inspector.transition.start') }}:</div>
        <Select
          :value="transition.startMode"
          @update:value="value => update({ startMode: value as TransitionStartMode })"
          style="width: 60%;"
          :options="[
            { label: t('inspector.transition.onClick'), value: 'click' },
            { label: t('inspector.transition.automatically'), value: 'auto' },
          ]"
        />
      </div>

      <div class="config-row" v-if="transition.startMode === 'auto'">
        <div class="config-label">{{ t('inspector.transition.delay') }} (s):</div>
        <NumberInput
          :min="0"
          :max="600"
          :step="0.1"
          :value="transition.delay / 1000"
          @update:value="value => update({ delay: Math.round(value * 1000) })"
          style="width: 60%;"
        />
      </div>

      <template v-if="definition.engine === 'magicMove'">
        <div class="config-row">
          <Checkbox
            :value="transition.unmatchedBehavior !== 'instant'"
            @update:value="value => update({ unmatchedBehavior: value ? 'fade' : 'instant' })"
          >{{ t('inspector.transition.fadeUnmatched') }}</Checkbox>
        </div>

        <div class="config-row">
          <div class="config-label">{{ t('inspector.transition.matchBy') }}:</div>
          <RadioGroup
            class="radio-cluster"
            button-style="solid"
            :value="transition.textMatchMode || 'object'"
            @update:value="value => update({ textMatchMode: value as TextMatchGranularity })"
            style="width: 60%;"
          >
            <RadioButton value="object" style="flex: 1;">{{ t('inspector.transition.matchObject') }}</RadioButton>
            <RadioButton value="word" style="flex: 1;">{{ t('inspector.transition.matchWord') }}</RadioButton>
            <RadioButton value="character" style="flex: 1;">{{ t('inspector.transition.matchCharacter') }}</RadioButton>
          </RadioGroup>
        </div>

        <div class="config-row">
          <div class="config-label">{{ t('inspector.transition.acceleration') }}:</div>
          <Select
            :value="transition.acceleration || 'easeInOut'"
            @update:value="value => update({ acceleration: value as TransitionAcceleration })"
            style="width: 60%;"
            :options="[
              { label: t('inspector.transition.easeInOut'), value: 'easeInOut' },
              { label: t('inspector.transition.easeIn'), value: 'easeIn' },
              { label: t('inspector.transition.easeOut'), value: 'easeOut' },
              { label: t('inspector.transition.linear'), value: 'constant' },
            ]"
          />
        </div>

        <Divider :margin="12" />
        <div class="inspector-header">
          <span class="inspector-title">{{ t('inspector.transition.matchedObjects') }}</span>
          <span class="inspector-badge">{{ matchAnalysis.matchedPairs.length }}</span>
        </div>

        <div v-if="!nextSlide" class="empty-hint">{{ t('inspector.transition.lastSlideHint') }}</div>
        <template v-else>
          <div v-if="!matchAnalysis.matchedPairs.length" class="empty-hint">{{ t('inspector.transition.noMatchesHint') }}</div>
          <div class="pair-list" v-else>
            <div
              class="pair-item"
              v-for="pair in matchAnalysis.matchedPairs"
              :key="pair.toElement.id"
              @click="selectElement(pair.fromElement.id)"
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
              <Button size="small" @click.stop="unlinkFromNextSlide(pair.toElement.id)">{{ t('inspector.transition.unlink') }}</Button>
            </div>
          </div>

          <template v-if="matchAnalysis.unmatchedIncoming.length && currentSlide.elements.length">
            <div class="section-subtitle">{{ t('inspector.transition.linkHint', undefined, { slide: slideIndex + 2 }) }}</div>
            <div class="unmatched-item" v-for="el in matchAnalysis.unmatchedIncoming" :key="el.id">
              <div class="unmatched-name">{{ getElementDisplayLabel(el) }}</div>
              <Select
                :value="''"
                @update:value="value => linkToCurrentSlide(el.id, value as string)"
                style="width: 55%;"
                :options="currentSlideElementOptions"
              />
            </div>
          </template>
        </template>
      </template>

      <Button class="apply-all-btn" @click="applyToAllSlides()">
        <i-icon-park-outline:check /> {{ t('inspector.transition.applyToAll') }}
      </Button>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { useSlidesStore } from '@/store'
import type {
  SlideTransition,
  TextMatchGranularity,
  TransitionAcceleration,
  TransitionStartMode,
} from '@/types/slides'
import {
  DEFAULT_TRANSITION,
  TRANSITIONS,
  TRANSITION_DIRECTIONS,
  TRANSITION_GROUPS,
  createTransition,
  getTransitionDefinition,
  type TransitionDefinition,
} from '@/configs/transitions'
import { analyzeSlideTransitionMatches, getElementDisplayLabel, runMagicMoveTransition } from '@/utils/magicMove'
import { playSlideTransition } from '@/utils/transitionEngine'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useSelectElement from '@/hooks/useSelectElement'
import message from '@/utils/message'
import { currentLocale, t } from '@/i18n'
import Button from '@/components/Button.vue'
import Checkbox from '@/components/Checkbox.vue'
import Divider from '@/components/Divider.vue'
import NumberInput from '@/components/NumberInput.vue'
import Select from '@/components/Select.vue'
import RadioGroup from '@/components/RadioGroup.vue'
import RadioButton from '@/components/RadioButton.vue'

const slidesStore = useSlidesStore()
const { slides, currentSlide, slideIndex } = storeToRefs(slidesStore)
const { addHistorySnapshot } = useHistorySnapshot()
const { selectElement } = useSelectElement()

/** As in Keynote, the transition belongs to this slide and plays when leaving it. */
const transition = computed<SlideTransition>(() => currentSlide.value?.transition ?? DEFAULT_TRANSITION)
const definition = computed(() => getTransitionDefinition(transition.value.effect))
const nextSlide = computed(() => slides.value[slideIndex.value + 1])
const galleryOpen = ref(false)

const label = (item: TransitionDefinition) => item.label[currentLocale.value]

const matchAnalysis = computed(() => analyzeSlideTransitionMatches(currentSlide.value, nextSlide.value))

const currentSlideElementOptions = computed(() => [
  { label: t('inspector.transition.linkPlaceholder'), value: '' },
  ...currentSlide.value.elements.map((el, index) => ({ label: getElementDisplayLabel(el, index), value: el.id })),
])

const setTransition = (next: SlideTransition | undefined) => {
  slidesStore.updateSlide({ transition: next })
  addHistorySnapshot()
}

const chooseEffect = (effect: string) => {
  galleryOpen.value = false
  if (effect === transition.value.effect) return
  setTransition(effect === 'none' ? undefined : createTransition(effect, currentSlide.value.transition))
}

const update = (patch: Partial<SlideTransition>) => setTransition({ ...transition.value, ...patch })

const applyToAllSlides = () => {
  const source = currentSlide.value.transition
  slidesStore.setSlides(slides.value.map(slide => ({ ...slide, transition: source ? { ...source } : undefined })))
  message.success(t('inspector.transition.appliedToAll'))
  addHistorySnapshot()
}

/** Play the transition in the editor: show the next slide and animate into it. */
const previewTransition = async () => {
  const from = currentSlide.value
  const to = nextSlide.value
  if (!to) return
  const fromIndex = slideIndex.value
  // The wrapper carries position only (the viewport inside it carries the zoom scale).
  const snapshot = document.querySelector('.canvas .viewport-wrapper') as HTMLElement | null
  const outgoing = snapshot?.cloneNode(true) as HTMLElement | undefined
  slidesStore.updateSlideIndex(fromIndex + 1)
  await nextTick()
  if (definition.value.engine === 'magicMove') {
    await runMagicMoveTransition(from, to, { mode: 'editor' })
  }
  else {
    const incoming = document.querySelector('.canvas .viewport-wrapper') as HTMLElement | null
    if (incoming && outgoing) {
      outgoing.style.pointerEvents = 'none'
      incoming.parentElement?.insertBefore(outgoing, incoming)
      await playSlideTransition({ outgoing, incoming, transition: transition.value })
      outgoing.remove()
    }
  }
  slidesStore.updateSlideIndex(fromIndex)
}

const unlinkFromNextSlide = (nextElementId: string) => {
  if (!nextSlide.value) return
  slidesStore.updateElement({ id: nextElementId, slideId: nextSlide.value.id, props: { continuityId: `unlinked-${nanoid(8)}` } })
  addHistorySnapshot()
}

const linkToCurrentSlide = (nextElementId: string, currentElementId: string) => {
  if (!currentElementId || !nextSlide.value) return
  const source = currentSlide.value.elements.find(item => item.id === currentElementId)
  if (!source) return
  const sharedContinuityId = source.continuityId || source.id
  if (!source.continuityId) slidesStore.updateElement({ id: source.id, props: { continuityId: sharedContinuityId } })
  slidesStore.updateElement({ id: nextElementId, slideId: nextSlide.value.id, props: { continuityId: sharedContinuityId } })
  addHistorySnapshot()
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
    font-size: var(--text-md);
    font-weight: 700;
    color: var(--text-primary, #1d1d1f);

    .header-icon {
      font-size: var(--text-lg);
      color: var(--accent-color, #007aff);
    }
  }

  .active-badge {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--accent-color, #007aff);
    background: rgba(0, 122, 255, 0.1);
    padding: 2px 8px;
    border-radius: 9999px;
  }
}

.effect-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;

  .effect-name {
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--text-primary, #1d1d1f);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.fidelity {
  margin-left: 4px;
  font-size: var(--text-xs);
  color: var(--text-secondary, #8e8e93);
}

.gallery {
  margin-bottom: 12px;
}

.group-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary, #8e8e93);
  margin: 10px 2px 6px;
}

.animation-pool {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.animation-item {
  min-height: 36px;
  background-color: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: var(--radius-control);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  &:hover:not(.active) {
    background-color: var(--bg-hover, rgba(0, 0, 0, 0.03));
    border-color: var(--border-color-active, rgba(0, 122, 255, 0.35));
  }

  &.active {
    border-color: var(--accent-color, #007aff);
    background-color: rgba(0, 122, 255, 0.08);
  }
}

.animation-text {
  font-size: var(--text-sm);
  color: var(--text-primary, #1d1d1f);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-done {
  width: 100%;
  margin-top: 10px;
}

.preview-btn,
.apply-all-btn {
  width: 100%;
  margin: 4px 0 12px;
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  .inspector-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary, #1d1d1f);
  }

  .inspector-badge {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--accent-color, #007aff);
    background: rgba(0, 122, 255, 0.1);
    padding: 1px 8px;
    border-radius: 9999px;
  }
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  .config-label {
    font-size: var(--text-sm);
    color: var(--text-secondary, #6e6e73);
  }
}

.section-subtitle {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary, #8e8e93);
  margin: 12px 0 6px;
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--text-secondary, #8e8e93);
  line-height: 1.5;
  padding: 8px 10px;
  border-radius: var(--radius-control);
  background: var(--bg-control, rgba(0, 0, 0, 0.04));
  margin-bottom: 10px;
}

.pair-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.pair-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-control);
  background: var(--bg-control, rgba(0, 0, 0, 0.04));
  cursor: pointer;

  &:hover {
    background: var(--bg-hover, rgba(0, 0, 0, 0.06));
  }
}

.pair-info {
  min-width: 0;

  .pair-names {
    font-size: var(--text-xs);
    color: var(--text-primary, #1d1d1f);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    .arrow {
      margin: 0 4px;
      color: var(--text-secondary, #8e8e93);
    }
  }

  .pair-meta {
    display: flex;
    gap: 6px;
    margin-top: 2px;
    font-size: var(--text-xs);
    color: var(--text-secondary, #8e8e93);

    .reason-tag {
      font-weight: 600;
    }
  }
}

.unmatched-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;

  .unmatched-name {
    font-size: var(--text-xs);
    color: var(--text-primary, #1d1d1f);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
