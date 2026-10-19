<template>
  <template v-if="slides.length">
    <Screen v-if="screening" />
    <Editor v-else-if="_isPC" />
    <Mobile v-else />
  </template>
  <FullscreenSpin tip="Initializing KeyNot Presentation Studio..." v-else loading :mask="false" />
</template>

<script lang="ts" setup>
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { debounce } from 'lodash'
import { useScreenStore, useMainStore, useSnapshotStore, useSlidesStore } from '@/store'
import { applyColorMode } from '@/store/main'
import { LOCALSTORAGE_KEY_DISCARDED_DB, LOCALSTORAGE_KEY_ACTIVE_PROJECT } from '@/configs/storage'
import { deleteDiscardedDB, getLocalProject, listLocalProjects, saveLocalProject } from '@/utils/database'
import { isPC } from '@/utils/common'
import api from '@/services'

import Editor from './views/Editor/index.vue'
import Screen from './views/Screen/index.vue'
import Mobile from './views/Mobile/index.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'

const _isPC = isPC()

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const snapshotStore = useSnapshotStore()
const screenStore = useScreenStore()
const { databaseId } = storeToRefs(mainStore)
const {
  projectId,
  title,
  slides,
  theme,
  viewportSize,
  viewportRatio,
  lastBackedUpAt,
  compatibilityReport,
  keynoteSourceBase64,
} = storeToRefs(slidesStore)
const { screening } = storeToRefs(screenStore)

const isAudienceMode = new URLSearchParams(window.location.search).get('mode') === 'audience'

const persistCurrentProject = debounce(async () => {
  if (isAudienceMode || !slides.value.length) return
  try {
    await saveLocalProject({
      id: projectId.value,
      title: title.value,
      slides: slides.value,
      theme: theme.value,
      viewportSize: viewportSize.value,
      viewportRatio: viewportRatio.value,
      updatedAt: Date.now(),
      backedUpAt: lastBackedUpAt.value || undefined,
      compatibilityReport: compatibilityReport.value,
      keynoteSourceBase64: keynoteSourceBase64.value,
    })
    localStorage.setItem(LOCALSTORAGE_KEY_ACTIVE_PROJECT, projectId.value)
    if (slidesStore.saveStatus !== 'backed_up') {
      slidesStore.setSaveStatus('saved')
    }
  }
  catch {
    slidesStore.setSaveStatus('unsaved')
  }
}, 400)

onMounted(async () => {
  applyColorMode(mainStore.colorMode)

  if (isAudienceMode) {
    slidesStore.setSlides([{
      id: nanoid(10),
      elements: [],
    }])
    screenStore.setScreening(true)
  }
  else {
    await deleteDiscardedDB()

    let restored = false
    try {
      const activeId = localStorage.getItem(LOCALSTORAGE_KEY_ACTIVE_PROJECT)
      let project = activeId ? await getLocalProject(activeId) : undefined
      if (!project) {
        const allProjects = await listLocalProjects()
        if (allProjects.length > 0) project = allProjects[0]
      }

      if (project && project.slides && project.slides.length > 0) {
        slidesStore.setProjectId(project.id)
        slidesStore.setTitle(project.title)
        slidesStore.setViewportSize(project.viewportSize || 1000)
        slidesStore.setViewportRatio(project.viewportRatio || 0.5625)
        slidesStore.setSlides(project.slides, project.theme)
        slidesStore.setCompatibilityReport(project.compatibilityReport || null)
        slidesStore.setKeynoteSourceBase64(project.keynoteSourceBase64 || null)
        slidesStore.setSaveStatus('saved')
        restored = true
      }
    }
    catch {
      restored = false
    }

    if (!restored) {
      const starterSlides = await api.getMockData('slides')
      slidesStore.setSlides(starterSlides)
      await persistCurrentProject()
    }

    snapshotStore.initSnapshotDatabase()
  }
})

watch(() => mainStore.colorMode, mode => {
  applyColorMode(mode)
})

watch(
  [title, slides, theme, viewportSize, viewportRatio, compatibilityReport],
  () => {
    if (isAudienceMode || !slides.value.length) return
    slidesStore.setSaveStatus('saving')
    persistCurrentProject()
  },
  { deep: true }
)

window.addEventListener('beforeunload', () => {
  const discardedDB = localStorage.getItem(LOCALSTORAGE_KEY_DISCARDED_DB)
  const discardedDBList: string[] = discardedDB ? JSON.parse(discardedDB) : []

  discardedDBList.push(databaseId.value)

  const newDiscardedDB = JSON.stringify(discardedDBList)
  localStorage.setItem(LOCALSTORAGE_KEY_DISCARDED_DB, newDiscardedDB)
})
</script>

<style lang="scss">
#app {
  height: 100%;
}
</style>