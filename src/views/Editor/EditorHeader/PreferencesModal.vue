<template>
  <div class="preferences-modal">
    <DialogHeader :title="t('preferences.title')" @close="emit('close')" />

    <SettingsGroup :title="t('preferences.language')">
      <SettingsRow :label="t('preferences.language')" :description="t('preferences.languageDescription')" stacked>
        <Tabs
          segmented
          :tabs="[{ key: 'en-US', label: t('preferences.languageEn') }, { key: 'pt-BR', label: t('preferences.languagePt') }]"
          :value="currentLocale"
          @update:value="key => key === 'pt-BR' ? setLocale('pt-BR') : setLocale('en-US')"
        />
      </SettingsRow>
    </SettingsGroup>

    <SettingsGroup :title="t('preferences.appearance')">
      <SettingsRow :label="t('preferences.appearance')" :description="t('preferences.appearanceDescription')" stacked>
        <Tabs
          segmented
          :tabs="[{ key: 'light', label: t('preferences.light') }, { key: 'dark', label: t('preferences.dark') }, { key: 'auto', label: t('preferences.auto') }]"
          :value="mainStore.colorMode"
          @update:value="key => key === 'dark' ? mainStore.setColorMode('dark') : key === 'auto' ? mainStore.setColorMode('auto') : mainStore.setColorMode('light')"
        />
      </SettingsRow>
    </SettingsGroup>

    <SettingsGroup :title="t('preferences.storageTitle')">
      <SettingsRow :label="t('preferences.autoSave')" :description="t('preferences.storageDescription')">
        <span class="status-badge">{{ t('preferences.storageActive') }}</span>
      </SettingsRow>
    </SettingsGroup>

    <footer class="dialog-footer">
      <PillButton variant="accent" @click="emit('close')">{{ t('preferences.close') }}</PillButton>
    </footer>
  </div>
</template>

<script setup lang="ts">
import DialogHeader from '@/components/ui/DialogHeader.vue'
import SettingsGroup from '@/components/ui/SettingsGroup.vue'
import SettingsRow from '@/components/ui/SettingsRow.vue'
import PillButton from '@/components/ui/PillButton.vue'
import Tabs from '@/components/Tabs.vue'
import { useMainStore } from '@/store'
import { useI18n } from '@/i18n'

const emit = defineEmits<{ (event: 'close'): void }>()
const mainStore = useMainStore()
const { currentLocale, setLocale, t } = useI18n()
</script>

<style scoped lang="scss">
/* The modal owns surface and padding; this view only lays out shared settings primitives. */
.status-badge {
  padding: 0 10px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: var(--weight-strong);
  color: var(--accent-green);
  background: color-mix(in srgb, var(--accent-green) 14%, transparent);
}
.dialog-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
