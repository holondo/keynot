<template>
  <div class="export-keynote-dialog">
    <div class="configs">
      <div class="status-banner" :class="{ 'has-source': !!keynoteSourceBase64 }">
        <div class="status-title">
          <strong v-if="keynoteSourceBase64">{{ labels.sourceTitle }}</strong>
          <strong v-else>{{ labels.newTitle }}</strong>
        </div>
        <div class="status-desc" v-if="keynoteSourceBase64">
          {{ labels.sourceDescription }}
        </div>
        <div class="status-desc" v-else>
          {{ labels.newDescription }}
        </div>
      </div>

      <div class="row">
        <div class="title">{{ labels.range }}:</div>
        <RadioGroup
          class="config-item"
          v-model:value="rangeType"
        >
          <RadioButton style="width: 33.33%;" value="all">{{ labels.all }}</RadioButton>
          <RadioButton style="width: 33.33%;" value="current">{{ labels.current }}</RadioButton>
          <RadioButton style="width: 33.33%;" value="custom">{{ labels.custom }}</RadioButton>
        </RadioGroup>
      </div>
      <div class="row" v-if="rangeType === 'custom'">
        <div class="title" :data-range="`(${range[0]} ~ ${range[1]})`">{{ labels.customRange }}:</div>
        <Slider
          class="config-item"
          range
          :min="1"
          :max="slides.length"
          :step="1"
          v-model:value="range"
        />
      </div>

      <div class="export-report" v-if="keynoteReport" role="status" aria-live="polite">
        <div>{{ labels.written }}: {{ keynoteReport.written.length }}</div>
        <details v-if="keynoteReport.keynotOnly.length" open>
          <summary>{{ labels.keynotOnly }}: {{ keynoteReport.keynotOnly.length }}</summary>
          <ul><li v-for="(entry, index) in keynoteReport.keynotOnly" :key="index"><strong>{{ entry.feature }}</strong>: {{ entry.message }}</li></ul>
        </details>
      </div>
    </div>
    <div class="btns">
      <Button class="btn export" type="primary" :disabled="exporting" @click="exportKeynote(selectedSlides)">
        <i-icon-park-outline:download /> {{ labels.export }}
      </Button>
      <Button class="btn close" @click="emit('close')">{{ labels.close }}</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import useExport from '@/hooks/useExport'
import { currentLocale } from '@/i18n'

import Slider from '@/components/Slider.vue'
import Button from '@/components/Button.vue'
import RadioButton from '@/components/RadioButton.vue'
import RadioGroup from '@/components/RadioGroup.vue'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const { slides, currentSlide, keynoteSourceBase64 } = storeToRefs(useSlidesStore())
const { exportKeynote, exporting, keynoteReport } = useExport()

const labels = computed(() => currentLocale.value === 'pt-BR' ? {
  sourceTitle: 'Edições no arquivo original do Keynote', newTitle: 'Apresentação nativa do Keynote',
  sourceDescription: 'Texto formatado, geometria, estilos de formas, imagens, valores de células, dados de gráficos, slides, transições e builds são gravados nos registros nativos. O relatório identifica o que fica apenas no KeyNot.',
  newDescription: 'Crie um .key nativo com o tema incluído. Texto, formas vetoriais, imagens, transições e builds permanecem editáveis. A renderização no Apple Keynote ainda precisa ser validada.',
  range: 'Slides', all: 'Todos', current: 'Atual', custom: 'Intervalo', customRange: 'Intervalo personalizado',
  export: 'Exportar .key', close: 'Fechar', written: 'Alterações nativas', keynotOnly: 'Disponível apenas no KeyNot',
} : {
  sourceTitle: 'Edits go back into the original Keynote file', newTitle: 'Native Keynote presentation',
  sourceDescription: 'Text formatting, geometry, shape styles, images, table cell values, chart data, slides, transitions and builds are written into native Keynote records. The report identifies features that remain in KeyNot only.',
  newDescription: 'Create a native .key presentation using the built-in theme. Text, vector shapes, images, transitions and builds remain editable. Rendering in Apple Keynote still requires validation.',
  range: 'Slide Range', all: 'All Slides', current: 'Current', custom: 'Custom', customRange: 'Custom Range',
  export: 'Export .key Archive', close: 'Close', written: 'Native changes', keynotOnly: 'Available in KeyNot only',
})

const rangeType = ref<'all' | 'current' | 'custom'>('all')
const range = ref<[number, number]>([1, slides.value.length])

const selectedSlides = computed(() => {
  if (rangeType.value === 'all') return slides.value
  if (rangeType.value === 'current') return [currentSlide.value]
  return slides.value.filter((item, index) => {
    const [min, max] = range.value
    return index >= min - 1 && index <= max - 1
  })
})
</script>

<style lang="scss" scoped>
.export-keynote-dialog {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.export-report {
  max-height: 180px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  ul { padding-left: 20px; }
}
.configs {
  width: min(400px, calc(100vw - 48px));
  height: calc(100% - 80px);
  display: flex;
  flex-direction: column;
  justify-content: center;

  .status-banner {
    background: var(--bg-control, rgba(128, 128, 128, 0.08));
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    border-radius: var(--radius-control);
    padding: 12px 14px;
    margin-bottom: 24px;

    &.has-source {
      background: rgba(99, 102, 241, 0.12);
      border-color: rgba(99, 102, 241, 0.4);
    }

    .status-title {
      font-size: var(--text-md);
      color: var(--text-primary, #1d1d1f);
      margin-bottom: 6px;
    }
    .status-desc {
      font-size: var(--text-sm);
      color: var(--text-secondary, #86868b);
      line-height: 1.5;
    }
  }

  .row {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 25px;
  }

  .title {
    width: 110px;
    position: relative;

    &::after {
      content: attr(data-range);
      position: absolute;
      top: 20px;
      left: 0;
    }
  }
  .config-item {
    flex: 1;
  }
}
.btns {
  width: 100%;
  max-width: 320px;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;

  .export {
    flex: 1;
  }
  .close {
    min-width: 90px;
    margin-left: 10px;
  }
}
</style>
