<template>
  <div class="project-manager-modal">
    <div class="header-row">
      <div class="header-titles">
        <div class="modal-title">Local Presentations (IndexedDB Workspace)</div>
        <div class="modal-subtitle">Decks are automatically saved in your browser for instant offline access and recovery.</div>
      </div>
      <Button type="primary" class="new-project-btn" @click="createNewProject()">
        <i-icon-park-outline:plus /> <span>New Presentation</span>
      </Button>
    </div>

    <div class="project-list" v-if="projects.length">
      <div
        class="project-card"
        :class="{ active: item.id === currentProjectId }"
        v-for="item in projects"
        :key="item.id"
        @click="switchProject(item)"
      >
        <div class="project-info">
          <div class="project-title">
            {{ item.title || 'Untitled Presentation' }}
            <span class="active-badge" v-if="item.id === currentProjectId">Active</span>
          </div>
          <div class="project-meta">
            <span>{{ item.slides?.length || 0 }} slides</span>
            <span>•</span>
            <span>Updated {{ formatTime(item.updatedAt) }}</span>
            <template v-if="item.backedUpAt">
              <span>•</span>
              <span class="backed-up">Backed up {{ formatTime(item.backedUpAt) }}</span>
            </template>
          </div>
        </div>
        <div class="project-actions" @click.stop>
          <Button size="small" @click="switchProject(item)" v-if="item.id !== currentProjectId">Open</Button>
          <Button size="small" @click="removeProject(item.id)" v-if="projects.length > 1">Delete</Button>
        </div>
      </div>
    </div>

    <div class="footer-row">
      <Button @click="restoreStarterShowcase()">Load KeyNot Starter Showcase</Button>
      <Button type="primary" @click="emit('close')">Close</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { useSlidesStore } from '@/store'
import { deleteLocalProject, listLocalProjects, saveLocalProject, type LocalProjectRecord } from '@/utils/database'
import { LOCALSTORAGE_KEY_ACTIVE_PROJECT } from '@/configs/storage'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import api from '@/services'
import message from '@/utils/message'
import Button from '@/components/Button.vue'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const slidesStore = useSlidesStore()
const { projectId: currentProjectId, theme } = storeToRefs(slidesStore)
const { addHistorySnapshot } = useHistorySnapshot()

const projects = ref<LocalProjectRecord[]>([])

const refreshList = async () => {
  projects.value = await listLocalProjects()
}

onMounted(refreshList)

const formatTime = (ts: number) => {
  if (!ts) return 'Never'
  return new Date(ts).toLocaleString()
}

const switchProject = (project: LocalProjectRecord) => {
  slidesStore.setProjectId(project.id)
  slidesStore.setTitle(project.title)
  slidesStore.setViewportSize(project.viewportSize || 1000)
  slidesStore.setViewportRatio(project.viewportRatio || 0.5625)
  slidesStore.setSlides(project.slides, project.theme)
  slidesStore.setCompatibilityReport(project.compatibilityReport || null)
  slidesStore.setKeynoteSourceBase64(project.keynoteSourceBase64 || null)
  slidesStore.setSaveStatus('saved')
  localStorage.setItem(LOCALSTORAGE_KEY_ACTIVE_PROJECT, project.id)
  addHistorySnapshot()
  message.success(`Opened "${project.title}"`)
  emit('close')
}

const createNewProject = async () => {
  const newId = nanoid(12)
  const blankSlide = {
    id: nanoid(10),
    turningMode: 'magicMove' as const,
    elements: [
      {
        type: 'text' as const,
        id: nanoid(10),
        continuityId: 'cont-title',
        name: 'Slide Title',
        left: 80,
        top: 190,
        width: 840,
        height: 110,
        rotate: 0,
        defaultFontName: 'Inter',
        defaultColor: '#0f172a',
        content: '<p><strong><span style="font-size: 48px; color: #0f172a;">Double-Click to Edit Title</span></strong></p>',
      },
    ],
    background: {
      type: 'solid' as const,
      color: '#f8fafc',
    },
  }
  slidesStore.setProjectId(newId)
  slidesStore.setTitle('Untitled Presentation')
  slidesStore.setCompatibilityReport(null)
  slidesStore.setKeynoteSourceBase64(null)
  slidesStore.updateSlideIndex(0)
  slidesStore.setSlides([blankSlide])
  await saveLocalProject({
    id: newId,
    title: 'Untitled Presentation',
    slides: [blankSlide],
    theme: theme.value,
    viewportSize: 1000,
    viewportRatio: 0.5625,
    updatedAt: Date.now(),
  })
  localStorage.setItem(LOCALSTORAGE_KEY_ACTIVE_PROJECT, newId)
  addHistorySnapshot()
  await refreshList()
  message.success('Created new presentation')
  emit('close')
}

const restoreStarterShowcase = async () => {
  const starterSlides = await api.getMockData('slides')
  const newId = nanoid(12)
  slidesStore.setProjectId(newId)
  slidesStore.setTitle('KeyNot Showcase')
  slidesStore.setCompatibilityReport(null)
  slidesStore.setKeynoteSourceBase64(null)
  slidesStore.updateSlideIndex(0)
  slidesStore.setSlides(starterSlides)
  localStorage.setItem(LOCALSTORAGE_KEY_ACTIVE_PROJECT, newId)
  addHistorySnapshot()
  await refreshList()
  message.success('Loaded KeyNot Showcase deck')
  emit('close')
}

const removeProject = async (id: string) => {
  await deleteLocalProject(id)
  await refreshList()
  if (id === currentProjectId.value && projects.value.length > 0) {
    switchProject(projects.value[0])
  }
}
</script>

<style lang="scss" scoped>
.project-manager-modal {
  font-size: 13px;
  color: var(--text-primary, #1e293b);
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  .header-titles {
    flex: 1;
    min-width: 0;
  }

  .modal-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    letter-spacing: -0.2px;
  }
  .modal-subtitle {
    font-size: 12px;
    color: var(--text-tertiary, #64748b);
    margin-top: 3px;
  }

  .new-project-btn {
    height: 32px;
    padding: 0 14px;
    white-space: nowrap;
    flex-shrink: 0;
  }
}
.project-list {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}
.project-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  background: var(--bg-control, #f8fafc);
  color: var(--text-primary, #0f172a);
  cursor: pointer;
  transition: all 0.15s ease;

  &.active {
    border-color: var(--accent-color, #007aff);
    background: rgba(0, 122, 255, 0.08);
  }
  &:hover:not(.active) {
    border-color: var(--accent-color, #007aff);
    background: var(--bg-control-active, #ffffff);
  }
}
.project-info {
  .project-title {
    font-weight: 600;
    color: var(--text-primary, #0f172a);
    display: flex;
    align-items: center;
    gap: 8px;

    .active-badge {
      background: var(--accent-color, #007aff);
      color: #fff;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 600;
    }
  }
  .project-meta {
    font-size: 11px;
    color: var(--text-tertiary, #64748b);
    margin-top: 4px;
    display: flex;
    gap: 6px;

    .backed-up {
      color: var(--accent-green, #15803d);
      font-weight: 600;
    }
  }
}
.project-actions {
  display: flex;
  gap: 6px;
}
.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}
</style>
