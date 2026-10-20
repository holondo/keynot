<template>
  <div class="version-history-modal">
    <DialogHeader :title="t('versions.title')" :subtitle="t('versions.savedVersions')" @close="emit('close')">
      <Button type="primary" class="create-checkpoint-btn" @click="handleCreateCheckpoint">
        <i-icon-park-outline:plus /> <span>{{ t('common.save') }}</span>
      </Button>
    </DialogHeader>

    <div class="checkpoint-creator-bar" v-if="showCustomNameInput">
      <Input
        v-model:value="newVersionLabel"
        :placeholder="t('versions.namePlaceholder')"
        style="flex: 1;"
        @enter="submitNewCheckpoint"
      />
      <Button type="primary" size="small" @click="submitNewCheckpoint">{{ t('common.save') }}</Button>
      <Button size="small" @click="showCustomNameInput = false">{{ t('common.cancel') }}</Button>
    </div>

    <div class="version-list" v-if="checkpoints.length">
      <div
        class="version-card"
        :class="{ active: selectedVersionId === item.id }"
        v-for="item in checkpoints"
        :key="item.id"
        @click="selectedVersionId = item.id"
      >
        <div class="version-info">
          <div class="version-title">
            <i-icon-park-outline:time class="time-icon" />
            <span class="label-text">{{ item.label }}</span>
            <span class="active-badge" v-if="selectedVersionId === item.id">{{ t('versions.preview') }}</span>
          </div>
          <div class="version-meta">
            <span>{{ t('versions.slideCount', undefined, { count: item.slideCount }) }}</span>
            <span>•</span>
            <span>{{ formatTime(item.timestamp) }}</span>
          </div>
        </div>
        <div class="version-actions" @click.stop>
          <Button size="small" type="primary" @click="handleRestore(item)">
            {{ t('versions.restore') }}
          </Button>
          <Button size="small" @click="handleDelete(item.id)">
            {{ t('versions.delete') }}
          </Button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <i-icon-park-outline:history-query class="empty-icon" />
      <div class="empty-title">{{ t('versions.noVersions') }}</div>
      <Button type="primary" @click="handleCreateCheckpoint" style="margin-top: 12px;">
        {{ t('common.save') }}
      </Button>
    </div>

    <div class="footer-row">
      <span class="checkpoint-count" v-if="checkpoints.length">{{ t('versions.checkpointCount', undefined, { count: checkpoints.length }) }}</span>
      <Button type="primary" @click="emit('close')">{{ t('versions.close') }}</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import DialogHeader from '@/components/ui/DialogHeader.vue'
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import {
  createProjectCheckpoint,
  deleteProjectCheckpoint,
  listProjectCheckpoints,
  restoreProjectCheckpoint,
  type ProjectVersionCheckpoint,
} from '@/utils/database'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import message from '@/utils/message'
import { t } from '@/i18n'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const slidesStore = useSlidesStore()
const { projectId, slides, theme } = storeToRefs(slidesStore)
const { addHistorySnapshot } = useHistorySnapshot()

const checkpoints = ref<ProjectVersionCheckpoint[]>([])
const selectedVersionId = ref<string>('')
const showCustomNameInput = ref(false)
const newVersionLabel = ref('')

const refreshList = async () => {
  if (!projectId.value) return
  checkpoints.value = await listProjectCheckpoints(projectId.value)
  if (checkpoints.value.length && !selectedVersionId.value) {
    selectedVersionId.value = checkpoints.value[0].id
  }
}

onMounted(refreshList)

const formatTime = (ts: number) => {
  if (!ts) return t('versions.unknownTime')
  return new Date(ts).toLocaleString()
}

const handleCreateCheckpoint = () => {
  showCustomNameInput.value = true
  newVersionLabel.value = t('versions.defaultCheckpointLabel', undefined, { time: new Date().toLocaleTimeString() })
}

const submitNewCheckpoint = async () => {
  if (!projectId.value) return
  const label = newVersionLabel.value.trim() || undefined
  const created = await createProjectCheckpoint(projectId.value, label, {
    slides: slides.value,
    theme: theme.value,
  })
  if (!created) return
  showCustomNameInput.value = false
  newVersionLabel.value = ''
  await refreshList()
  message.success(t('versions.checkpointCreated'))
}

const handleRestore = async (checkpoint: ProjectVersionCheckpoint) => {
  if (!projectId.value) return
  const restored = await restoreProjectCheckpoint(projectId.value, checkpoint.id)
  if (restored) {
    slidesStore.setSlides(restored.slides, restored.theme)
    addHistorySnapshot()
    message.success(t('versions.restoredSuccess', undefined, {
      label: restored.label || t('versions.fallbackCheckpointLabel'),
    }))
    emit('close')
  }
}

const handleDelete = async (versionId: string) => {
  if (!projectId.value) return
  await deleteProjectCheckpoint(projectId.value, versionId)
  if (selectedVersionId.value === versionId) {
    selectedVersionId.value = ''
  }
  await refreshList()
  message.success(t('versions.deletedSuccess'))
}
</script>

<style lang="scss" scoped>
.version-history-modal {
  padding: 8px 4px;
}





.checkpoint-creator-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-control, rgba(0, 0, 0, 0.03));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: var(--radius-control);
  margin-bottom: 14px;
}

.version-list {
  max-height: 380px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.version-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: var(--radius-control);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: #007aff;
    background: var(--bg-hover, rgba(0, 122, 255, 0.02));
  }

  &.active {
    border-color: #007aff;
    background: rgba(0, 122, 255, 0.04);
  }
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.version-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--text-primary, #1d1d1f);

  .time-icon {
    font-size: var(--text-lg);
    color: #007aff;
  }
}

.active-badge {
  font-size: var(--text-xs);
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
  padding: 1px 6px;
  border-radius: var(--radius-menu);
  font-weight: 500;
}

.version-meta {
  font-size: var(--text-xs);
  color: var(--text-secondary, #86868b);
  display: flex;
  gap: 6px;
}

.version-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  text-align: center;

  .empty-icon {
    font-size: 36px;
    color: var(--text-secondary, #86868b);
    margin-bottom: 8px;
  }

  .empty-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary, #1d1d1f);
    margin-bottom: 4px;
  }

  .empty-desc {
    font-size: var(--text-sm);
    color: var(--text-secondary, #86868b);
    max-width: 320px;
  }
}

.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));

  .checkpoint-count {
    font-size: var(--text-sm);
    color: var(--text-secondary, #86868b);
  }
}
</style>
