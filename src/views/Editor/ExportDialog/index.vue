<template>
  <div class="export-dialog">
    <DialogHeader class="export-header" :title="t('header.export')" @close="setDialogForExport('')" />
    <Tabs 
      :tabs="tabs" 
      :value="dialogForExport" 
      card
      @update:value="key => setDialogForExport(key as DialogForExportTypes)" 
    />
    <div class="content">
      <component :is="currentDialogComponent" @close="setDialogForExport('')"></component>
    </div>
  </div>
</template>

<script lang="ts" setup>
import DialogHeader from '@/components/ui/DialogHeader.vue'
import { t } from '@/i18n'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import type { DialogForExportTypes } from '@/types/export'

import ExportImage from './ExportImage.vue'
import ExportJSON from './ExportJSON.vue'
import ExportPDF from './ExportPDF.vue'
import ExportPPTX from './ExportPPTX.vue'
import ExportSpecificFile from './ExportSpecificFile.vue'
import ExportKeynote from './ExportKeynote.vue'
import Tabs from '@/components/Tabs.vue'

interface TabItem {
  key: DialogForExportTypes
  label: string
}

const mainStore = useMainStore()
const { dialogForExport } = storeToRefs(mainStore)

const setDialogForExport = mainStore.setDialogForExport

const tabs: TabItem[] = [
  { key: 'keynote', label: 'Keynote (.key)' },
  { key: 'pptx', label: 'PowerPoint (.pptx)' },
  { key: 'pdf', label: 'PDF' },
  { key: 'image', label: 'Images' },
  { key: 'pptist', label: 'KeyNot Project' },
  { key: 'json', label: 'JSON' },
]

const currentDialogComponent = computed<unknown>(() => {
  const dialogMap = {
    'image': ExportImage,
    'json': ExportJSON,
    'pdf': ExportPDF,
    'pptx': ExportPPTX,
    'pptist': ExportSpecificFile,
    'keynote': ExportKeynote,
  }
  if (dialogForExport.value) return dialogMap[dialogForExport.value] || null
  return null
})
</script>

<style lang="scss" scoped>
.export-dialog {
  margin: calc(var(--modal-pad, 20px) * -1);
  padding-top: var(--modal-pad, 20px);
  .export-header { padding: 0 var(--modal-pad, 20px); margin-bottom: 12px; }
  :deep(.tabs) { margin: 0 var(--modal-pad, 20px); }
}
.content {
  height: min(460px, calc(100dvh - 180px));
  padding: 12px;
  font-size: var(--text-md);

  @include overflow-overlay();
}
</style>
