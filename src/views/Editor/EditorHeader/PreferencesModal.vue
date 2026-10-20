<template>
  <div class="preferences-modal">
    <div class="modal-header">
      <div class="modal-title">
        <i-icon-park-outline:setting-two class="icon" />
        <span>{{ t('preferences.title') }}</span>
      </div>
      <button class="close-btn" @click="emit('close')">
        <i-icon-park-outline:close />
      </button>
    </div>

    <div class="modal-body">
      <!-- Section: Language / Idioma -->
      <div class="pref-section">
        <div class="section-title">{{ t('preferences.language') }}</div>
        <div class="pref-row">
          <div class="pref-label">
            <span class="label-main">{{ t('preferences.language') }}</span>
            <span class="label-sub">English first (default), or switch to Portuguese</span>
          </div>
          <div class="pref-control">
            <div class="segmented-control">
              <button
                class="seg-item"
                :class="{ active: currentLocale === 'en-US' }"
                @click="setLocale('en-US')"
              >
                <span class="flag">🇺🇸</span>
                <span>{{ t('preferences.languageEn') }}</span>
              </button>
              <button
                class="seg-item"
                :class="{ active: currentLocale === 'pt-BR' }"
                @click="setLocale('pt-BR')"
              >
                <span class="flag">🇧🇷</span>
                <span>{{ t('preferences.languagePt') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Appearance / Tema -->
      <div class="pref-section">
        <div class="section-title">{{ t('preferences.appearance') }}</div>
        <div class="pref-row">
          <div class="pref-label">
            <span class="label-main">{{ t('preferences.appearance') }}</span>
            <span class="label-sub">Light, Dark, or System Match</span>
          </div>
          <div class="pref-control">
            <div class="segmented-control theme-seg">
              <button
                class="seg-item"
                :class="{ active: mainStore.colorMode === 'light' }"
                @click="mainStore.setColorMode('light')"
              >
                <i-icon-park-outline:sun class="seg-icon" />
                <span>{{ t('preferences.light') }}</span>
              </button>
              <button
                class="seg-item"
                :class="{ active: mainStore.colorMode === 'dark' }"
                @click="mainStore.setColorMode('dark')"
              >
                <i-icon-park-outline:moon class="seg-icon" />
                <span>{{ t('preferences.dark') }}</span>
              </button>
              <button
                class="seg-item"
                :class="{ active: mainStore.colorMode === 'auto' }"
                @click="mainStore.setColorMode('auto')"
              >
                <i-icon-park-outline:laptop-computer class="seg-icon" />
                <span>{{ t('preferences.auto') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Storage & Durability -->
      <div class="pref-section">
        <div class="section-title">Storage &amp; Durability</div>
        <div class="pref-row">
          <div class="pref-label">
            <span class="label-main">{{ t('preferences.autoSave') }}</span>
            <span class="label-sub">All slides &amp; versions persist offline in local IndexedDB</span>
          </div>
          <div class="pref-status">
            <span class="status-badge active">Active (IndexedDB)</span>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button class="done-btn" @click="emit('close')">
        {{ t('preferences.close') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMainStore } from '@/store'
import { useI18n } from '@/i18n'

const emit = defineEmits<{ (event: 'close'): void }>()
const mainStore = useMainStore()
const { currentLocale, setLocale, t } = useI18n()
</script>

<style scoped lang="scss">
.preferences-modal {
  padding: 22px 24px;
  background: var(--bg-card, #ffffff);
  color: var(--text-primary, #1d1d1f);
  font-family: var(--font-ui);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-divider, rgba(0, 0, 0, 0.08));

  .modal-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;

    .icon {
      font-size: 18px;
      color: var(--accent-color, #007aff);
    }
  }

  .close-btn {
    border: none;
    background: transparent;
    color: var(--text-tertiary, #86868b);
    font-size: 16px;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;

    &:hover {
      background: var(--bg-control, rgba(0, 0, 0, 0.06));
      color: var(--text-primary, #1d1d1f);
    }
  }
}

.modal-body {
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pref-section {
  .section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary, #86868b);
    margin-bottom: 10px;
  }
}

.pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  background: var(--bg-control, rgba(0, 0, 0, 0.03));
  border-radius: 10px;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));

  .pref-label {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .label-main {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary, #1d1d1f);
    }

    .label-sub {
      font-size: 11.5px;
      color: var(--text-secondary, #86868b);
    }
  }
}

.segmented-control {
  display: inline-flex;
  background: var(--bg-control, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  padding: 2px;
  gap: 2px;

  .seg-item {
    height: 28px;
    padding: 0 12px;
    border: none;
    background: transparent;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary, #666);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;

    .flag {
      font-size: 13px;
    }

    .seg-icon {
      font-size: 12px;
    }

    &:hover:not(.active) {
      color: var(--text-primary, #1d1d1f);
    }

    &.active {
      background: var(--accent-color, #007aff);
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 122, 255, 0.3);
    }
  }
}

.status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;

  &.active {
    background: rgba(52, 199, 89, 0.15);
    color: #28a745;
    border: 1px solid rgba(52, 199, 89, 0.3);
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px solid var(--border-divider, rgba(0, 0, 0, 0.08));

  .done-btn {
    height: 32px;
    padding: 0 18px;
    border-radius: 8px;
    border: none;
    background: var(--accent-color, #007aff);
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: #0066d6;
    }
  }
}
</style>
