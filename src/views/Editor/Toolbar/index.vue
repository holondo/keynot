<template>
  <div class="keynote-inspector">
    <div class="inspector-mode-switch">
      <Tabs
        :tabs="inspectorModes"
        :value="inspectorMode"
        segmented
        @update:value="switchInspectorMode"
      />
    </div>
    <div class="inspector-tabs-header">
      <Tabs 
        v-if="currentTabs.length > 1"
        :tabs="currentTabs" 
        :value="activeTabKey" 
        card 
        @update:value="key => handleTabChange(key as string)"
      />
      <div v-else class="single-tab-header">
        <span class="single-tab-title">{{ currentTabs[0]?.label || 'Inspector' }}</span>
      </div>
    </div>

    <div class="inspector-body">
      <div v-if="panelError" class="inspector-error-fallback">
        <div class="error-title">Unable to display controls</div>
        <div class="error-msg">{{ panelError.message }}</div>
        <button class="retry-btn" @click="panelError = null">Retry</button>
      </div>

      <template v-else>
        <!-- Animate Mode -->
        <template v-if="inspectorMode === 'animate'">
          <ElementAnimationPanel v-if="activeElementIdList.length" />
          <SlideAnimationPanel v-else />
        </template>

        <!-- Document Mode -->
        <template v-else-if="inspectorMode === 'document'">
          <DocumentPanel />
        </template>

        <!-- Format Mode -->
        <template v-else>
          <SlideLayoutTab v-if="formatSubTab === 'slideLayout'" />
          <ArrangeTab v-else-if="formatSubTab === 'arrange'" />
          <MultiStylePanel v-else-if="activeElementIdList.length > 1 && formatSubTab === 'style'" />
          <TextTab v-else-if="formatSubTab === 'text'" />
          <ImageTab v-else-if="formatSubTab === 'image'" />
          <TableTab v-else-if="formatSubTab === 'table'" />
          <CellTab v-else-if="formatSubTab === 'cell'" />
          <DataTab v-else-if="formatSubTab === 'data'" />
          <ChartStylePanel v-else-if="formatSubTab === 'chart'" />
          <StyleTab v-else />
        </template>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onErrorCaptured, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import { t } from '@/i18n'
import Tabs from '@/components/Tabs.vue'

// Format Tabs
import StyleTab from './Format/StyleTab.vue'
import TextTab from './Format/TextTab.vue'
import ImageTab from './Format/ImageTab.vue'
import TableTab from './Format/TableTab.vue'
import CellTab from './Format/CellTab.vue'
import DataTab from './Format/DataTab.vue'
import ArrangeTab from './Format/ArrangeTab.vue'
import SlideLayoutTab from './Format/SlideLayoutTab.vue'
import ChartStylePanel from './ElementStylePanel/ChartStylePanel/index.vue'
import MultiStylePanel from './MultiStylePanel.vue'

// Animate & Document Panels
import SlideAnimationPanel from './SlideAnimationPanel.vue'
import ElementAnimationPanel from './ElementAnimationPanel.vue'
import DocumentPanel from './DocumentPanel.vue'

const mainStore = useMainStore()
const { activeElementIdList, handleElement, inspectorMode, selectedTableCells } = storeToRefs(mainStore)

const formatSubTab = ref('style')
const animateSubTab = ref('transition')
const documentSubTab = ref('document')
const panelError = ref<Error | null>(null)
const inspectorModes = computed(() => [
  { label: t('toolbar.formatInspector'), key: 'format' },
  { label: t('toolbar.animateInspector'), key: 'animate' },
  { label: t('toolbar.documentInspector'), key: 'document' },
])
const switchInspectorMode = (mode: string) => {
  mainStore.setInspectorMode(mode as 'format' | 'animate' | 'document')
}

onErrorCaptured((err) => {
  console.error('[Inspector Error Boundary]', err)
  panelError.value = err instanceof Error ? err : new Error(String(err))
  return false
})

const currentTabs = computed(() => {
  if (inspectorMode.value === 'animate') {
    if (activeElementIdList.value.length) {
      return [{ label: t('inspector.tabs.builds'), key: 'builds' }]
    }
    return [{ label: t('inspector.tabs.transition'), key: 'transition' }]
  }

  if (inspectorMode.value === 'document') {
    return [{ label: t('inspector.tabs.document'), key: 'document' }]
  }

  // Format mode: dynamic tabs based on selected object
  if (!activeElementIdList.value.length) {
    return [{ label: t('inspector.tabs.slideLayout'), key: 'slideLayout' }]
  }

  if (activeElementIdList.value.length > 1) {
    return [
      { label: t('inspector.tabs.style'), key: 'style' },
      { label: t('inspector.tabs.arrange'), key: 'arrange' },
    ]
  }

  const el = handleElement.value
  if (!el) return [{ label: t('inspector.tabs.slideLayout'), key: 'slideLayout' }]

  switch (el.type) {
    case 'text':
      return [
        { label: t('inspector.tabs.style'), key: 'style' },
        { label: t('inspector.tabs.text'), key: 'text' },
        { label: t('inspector.tabs.arrange'), key: 'arrange' },
      ]
    case 'shape':
      return [
        { label: t('inspector.tabs.style'), key: 'style' },
        { label: t('inspector.tabs.text'), key: 'text' },
        { label: t('inspector.tabs.arrange'), key: 'arrange' },
      ]
    case 'image':
      return [
        { label: t('inspector.tabs.style'), key: 'style' },
        { label: t('inspector.tabs.image'), key: 'image' },
        { label: t('inspector.tabs.arrange'), key: 'arrange' },
      ]
    case 'table':
      if (selectedTableCells.value.length > 0) {
        return [
          { label: t('inspector.tabs.table'), key: 'table' },
          { label: t('inspector.tabs.cell'), key: 'cell' },
          { label: t('inspector.tabs.data'), key: 'data' },
          { label: t('inspector.tabs.arrange'), key: 'arrange' },
        ]
      }
      return [
        { label: t('inspector.tabs.table'), key: 'table' },
        { label: t('inspector.tabs.arrange'), key: 'arrange' },
      ]
    case 'chart':
      return [
        { label: t('toolbar.insertChart'), key: 'chart' },
        { label: t('inspector.tabs.arrange'), key: 'arrange' },
      ]
    case 'line':
    case 'latex':
    case 'video':
    case 'audio':
    default:
      return [
        { label: t('inspector.tabs.style'), key: 'style' },
        { label: t('inspector.tabs.arrange'), key: 'arrange' },
      ]
  }
})

// Auto-select the most relevant default tab when selection changes
watch([handleElement, activeElementIdList, inspectorMode, selectedTableCells], () => {
  panelError.value = null

  if (inspectorMode.value === 'animate') {
    animateSubTab.value = activeElementIdList.value.length ? 'builds' : 'transition'
    return
  }
  if (inspectorMode.value === 'document') {
    documentSubTab.value = 'document'
    return
  }

  const validKeys = currentTabs.value.map(t => t.key)
  if (!validKeys.includes(formatSubTab.value)) {
    if (!activeElementIdList.value.length) {
      formatSubTab.value = 'slideLayout'
    } else if (handleElement.value?.type === 'text') {
      formatSubTab.value = 'text'
    } else if (handleElement.value?.type === 'image') {
      formatSubTab.value = 'image'
    } else if (handleElement.value?.type === 'table') {
      formatSubTab.value = selectedTableCells.value.length > 0 ? 'cell' : 'table'
    } else if (handleElement.value?.type === 'chart') {
      formatSubTab.value = 'chart'
    } else {
      formatSubTab.value = validKeys[0] || 'style'
    }
  }
}, { immediate: true })

const activeTabKey = computed(() => {
  if (inspectorMode.value === 'animate') return animateSubTab.value
  if (inspectorMode.value === 'document') return documentSubTab.value
  return formatSubTab.value
})

const handleTabChange = (key: string) => {
  panelError.value = null
  if (inspectorMode.value === 'animate') {
    animateSubTab.value = key
  } else if (inspectorMode.value === 'document') {
    documentSubTab.value = key
  } else {
    formatSubTab.value = key
  }
}

const activeComponent = computed(() => {
  if (inspectorMode.value === 'animate') {
    return activeElementIdList.value.length ? ElementAnimationPanel : SlideAnimationPanel
  }
  if (inspectorMode.value === 'document') {
    return DocumentPanel
  }

  // Format mode component mapping
  if (formatSubTab.value === 'slideLayout') return SlideLayoutTab
  if (formatSubTab.value === 'arrange') return ArrangeTab

  if (activeElementIdList.value.length > 1 && formatSubTab.value === 'style') {
    return MultiStylePanel
  }

  switch (formatSubTab.value) {
    case 'text':
      return TextTab
    case 'image':
      return ImageTab
    case 'table':
      return TableTab
    case 'cell':
      return CellTab
    case 'data':
      return DataTab
    case 'chart':
      return ChartStylePanel
    case 'style':
    default:
      return StyleTab
  }
})
</script>

<style lang="scss" scoped>
.keynote-inspector {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  border: 0;
  color: var(--text-inspector, rgb(50, 50, 50));
  font-family: var(--font-ui);
  box-sizing: border-box;
}

.inspector-mode-switch {
  flex: 0 0 auto;
  padding: 10px 10px 0;

  :deep(.tabs) {
    width: 100%;
    min-height: 34px;
  }
}

.inspector-tabs-header {
  flex-shrink: 0;
  padding: 8px 10px;
  background: transparent;
  border-bottom: 1px solid var(--border-divider, rgba(0, 0, 0, 0.08));

  ::v-deep(.tabs.card) {
    height: var(--inspector-tab-height, 33px);
    padding: 2px;
    background: var(--bg-control, rgba(0, 0, 0, 0.04));
    border-radius: var(--inspector-control-radius, 8px);
    border: none;
    gap: 2px;

    .tab {
      height: calc(var(--inspector-tab-height, 33px) - 4px);
      line-height: calc(var(--inspector-tab-height, 33px) - 4px);
      font-size: var(--inspector-tab-font-size, 12px);
      font-weight: 500;
      color: var(--text-secondary, rgb(121, 121, 121));
      border-radius: 6px;
      transition: all 0.15s ease;

      &.active {
        background: var(--bg-control-active, #ffffff);
        color: var(--accent-color, rgb(0, 122, 255));
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      }

      &:hover:not(.active) {
        color: var(--text-primary, rgba(0, 0, 0, 0.88));
      }
    }
  }

  .single-tab-header {
    height: var(--inspector-tab-height, 33px);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-control, rgba(0, 0, 0, 0.04));
    border-radius: var(--inspector-control-radius, 8px);
    padding: 0 12px;

    .single-tab-title {
      font-size: var(--inspector-tab-font-size, 12px);
      font-weight: 600;
      color: var(--text-primary, rgba(0, 0, 0, 0.88));
      letter-spacing: -0.1px;
    }
  }
}

.inspector-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 16px;
  box-sizing: border-box;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.25);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(128, 128, 128, 0.4);
  }
}

.inspector-error-fallback {
  padding: 16px 12px;
  background: rgba(255, 59, 48, 0.08);
  border: 1px solid rgba(255, 59, 48, 0.2);
  border-radius: 8px;
  text-align: center;

  .error-title {
    font-size: 12.5px;
    font-weight: 600;
    color: #ff3b30;
    margin-bottom: 4px;
  }

  .error-msg {
    font-size: 11px;
    color: var(--text-secondary, #666);
    margin-bottom: 12px;
    word-break: break-word;
  }

  .retry-btn {
    padding: 4px 12px;
    font-size: 11.5px;
    border-radius: 6px;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.15));
    background: var(--bg-control, #ffffff);
    color: var(--text-primary, #1d1d1f);
    cursor: pointer;

    &:hover {
      background: var(--bg-control-active, #f2f2f7);
    }
  }
}
</style>
