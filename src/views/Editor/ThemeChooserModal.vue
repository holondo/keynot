<template>
  <div class="theme-chooser-dialog">
    <!-- Header -->
    <div class="dialog-header">
      <div class="header-left">
        <span class="dialog-title">Choose a Theme</span>
      </div>
      <div class="header-right">
        <!-- Wide (16:9) / Standard (4:3) Aspect Ratio Segmented Control (Image 5) -->
        <div class="ratio-selector">
          <div 
            class="ratio-pill" 
            :class="{ active: selectedRatio === 'wide' }" 
            @click="selectedRatio = 'wide'"
          >
            Wide (16:9)
          </div>
          <div 
            class="ratio-pill" 
            :class="{ active: selectedRatio === 'standard' }" 
            @click="selectedRatio = 'standard'"
          >
            Standard (4:3)
          </div>
        </div>
        <button class="close-x-btn" @click="closeModal" title="Close">
          <i-icon-park-outline:close />
        </button>
      </div>
    </div>

    <!-- Body Layout: Sidebar + Main Content (Image 5) -->
    <div class="dialog-body">
      <!-- Left Category Sidebar -->
      <div class="sidebar">
        <div class="search-wrap">
          <div class="search-box">
            <i-icon-park-outline:search class="search-icon" />
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Search themes..." 
              class="search-input"
            />
            <i-icon-park-outline:close v-if="searchQuery" class="clear-icon" @click="searchQuery = ''" />
          </div>
        </div>

        <div class="categories-list">
          <div 
            class="category-item" 
            v-for="cat in categories" 
            :key="cat.id"
            :class="{ active: activeCategory === cat.id }"
            @click="activeCategory = cat.id"
          >
            <component :is="cat.icon" class="cat-icon" />
            <span class="cat-label">{{ cat.name }}</span>
          </div>
        </div>
      </div>

      <!-- Main Scrollable Theme Grid -->
      <div class="main-content">
        <!-- Themes Sections -->
        <div class="themes-container">
          <div 
            class="theme-section" 
            v-for="section in displayedSections" 
            :key="section.title"
          >
            <div class="section-title">{{ section.title }}</div>
            <div class="themes-grid">
              <div 
                class="theme-card" 
                v-for="item in section.items" 
                :key="item.id"
                :class="{ 
                  selected: selectedThemeId === item.id,
                  standard: selectedRatio === 'standard'
                }"
                @click="selectedThemeId = item.id"
                @dblclick="applyThemeAndClose"
              >
                <!-- Mini slide preview -->
                <div 
                  class="preview-slide" 
                  :style="{ 
                    background: item.previewBg,
                    color: item.fontColor 
                  }"
                >
                  <div class="slide-mockup-content">
                    <div class="mockup-kicker" v-if="item.kicker">{{ item.kicker }}</div>
                    <div class="mockup-title" :style="{ fontFamily: item.fontFamily || 'inherit' }">
                      {{ item.titleSample || 'KeyNot' }}
                    </div>
                    <div class="mockup-subtitle" :style="{ opacity: 0.65 }">
                      {{ item.subtitleSample || 'Presentation' }}
                    </div>
                    <div class="mockup-decor" :style="{ background: item.colors[0] }"></div>
                  </div>

                  <!-- Selected Checkmark Overlay -->
                  <div class="selected-badge" v-if="selectedThemeId === item.id">
                    <i-icon-park-outline:check class="check-icon" />
                  </div>
                </div>

                <!-- Theme Info & Swatches -->
                <div class="theme-info">
                  <span class="theme-name">{{ item.name }}</span>
                  <div class="theme-swatches">
                    <span 
                      class="swatch" 
                      v-for="(color, idx) in item.colors.slice(0, 4)" 
                      :key="idx"
                      :style="{ background: color }"
                    ></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Actions (Image 5) -->
    <div class="dialog-footer">
      <button class="footer-btn secondary" @click="closeModal">Cancel</button>
      <div class="footer-center">
        <button class="footer-btn ai-generate-btn" @click="openAIStudio">
          <svg class="sparkle-icon" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" />
          </svg>
          <span>Generate Theme with AI</span>
        </button>
      </div>
      <button class="footer-btn primary" :disabled="!selectedThemeId" @click="applyThemeAndClose">
        Create Presentation
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, h } from 'vue'
import { useMainStore, useSlidesStore } from '@/store'
import type { SlideTheme } from '@/types/slides'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()

const searchQuery = ref('')
const activeCategory = ref('all')
const selectedRatio = ref<'wide' | 'standard'>('wide')
const selectedThemeId = ref('white')

// Category icons
const GridIcon = () => h('svg', { viewBox: '0 0 16 16', fill: 'currentColor' }, [
  h('path', { d: 'M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z' })
])
const ClockIcon = () => h('svg', { viewBox: '0 0 16 16', fill: 'currentColor' }, [
  h('path', { d: 'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-4a.75.75 0 0 1 .75.75v3.5h2.5a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75v-4.25A.75.75 0 0 1 8 4z' })
])
const ShapesIcon = () => h('svg', { viewBox: '0 0 16 16', fill: 'currentColor' }, [
  h('path', { d: 'M7.5 1.5a.75.75 0 0 1 1 0l5 5a.75.75 0 0 1 0 1l-5 5a.75.75 0 0 1-1 0l-5-5a.75.75 0 0 1 0-1l5-5z' })
])
const BriefcaseIcon = () => h('svg', { viewBox: '0 0 16 16', fill: 'currentColor' }, [
  h('path', { d: 'M5.5 2A1.5 1.5 0 0 0 4 3.5V4H1.5A1.5 1.5 0 0 0 0 5.5v8A1.5 1.5 0 0 0 1.5 15h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 14.5 4H12v-.5A1.5 1.5 0 0 0 10.5 2h-5zm0 1.5h5V4h-5v-.5z' })
])
const PaletteIcon = () => h('svg', { viewBox: '0 0 16 16', fill: 'currentColor' }, [
  h('path', { d: 'M8 0a8 8 0 1 0 8 8 8 8 0 0 0-8-8zm-5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm4-4a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm4 4a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm-2 4a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z' })
])

const categories = [
  { id: 'all', name: 'All Themes', icon: GridIcon },
  { id: 'recents', name: 'Recents', icon: ClockIcon },
  { id: 'basic', name: 'Basic', icon: ShapesIcon },
  { id: 'business', name: 'Business', icon: BriefcaseIcon },
  { id: 'creative', name: 'Creative', icon: PaletteIcon },
]

interface ThemeDefinition {
  id: string
  name: string
  category: string
  previewBg: string
  fontColor: string
  fontFamily?: string
  kicker?: string
  titleSample?: string
  subtitleSample?: string
  colors: string[]
  themeData: SlideTheme
}

const ALL_THEMES: ThemeDefinition[] = [
  // Recents / Basic (Image 5)
  {
    id: 'white',
    name: 'White',
    category: 'basic',
    previewBg: '#ffffff',
    fontColor: '#1d1d1f',
    kicker: 'KEYNOTE',
    titleSample: 'White',
    subtitleSample: 'Clean & Modern Minimalist',
    colors: ['#007aff', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#5856d6'],
    themeData: {
      backgroundColor: '#ffffff',
      fontColor: '#1d1d1f',
      fontName: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Helvetica, Arial, sans-serif',
      themeColors: ['#007aff', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#5856d6'],
      outline: { style: 'solid', width: 2, color: '#e5e5ea' },
      shadow: { h: 0, v: 4, blur: 12, color: 'rgba(0,0,0,0.08)' }
    }
  },
  {
    id: 'black',
    name: 'Black',
    category: 'basic',
    previewBg: '#0f0f11',
    fontColor: '#f5f5f7',
    kicker: 'PRO STUDIO',
    titleSample: 'Black',
    subtitleSample: 'High Impact Contrast',
    colors: ['#0a84ff', '#30d158', '#ffd60a', '#bf5af2', '#ff453a', '#5e5ce6'],
    themeData: {
      backgroundColor: '#0f0f11',
      fontColor: '#f5f5f7',
      fontName: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      themeColors: ['#0a84ff', '#30d158', '#ffd60a', '#bf5af2', '#ff453a', '#5e5ce6'],
      outline: { style: 'solid', width: 2, color: '#38383e' },
      shadow: { h: 0, v: 6, blur: 16, color: 'rgba(0,0,0,0.4)' }
    }
  },
  {
    id: 'gradient',
    name: 'Gradient',
    category: 'basic',
    previewBg: 'linear-gradient(135deg, #1f2335 0%, #11131c 100%)',
    fontColor: '#ffffff',
    kicker: 'ATMOSPHERE',
    titleSample: 'Gradient',
    subtitleSample: 'Subtle Fluid Background',
    colors: ['#32ade6', '#007aff', '#af52de', '#ff2d55', '#34c759', '#ff9500'],
    themeData: {
      backgroundColor: '#16192b',
      fontColor: '#ffffff',
      fontName: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      themeColors: ['#32ade6', '#007aff', '#af52de', '#ff2d55', '#34c759', '#ff9500'],
      outline: { style: 'solid', width: 2, color: '#2a314d' },
      shadow: { h: 0, v: 8, blur: 20, color: 'rgba(0,0,0,0.3)' }
    }
  },
  {
    id: 'bold-type',
    name: 'Bold Type',
    category: 'basic',
    previewBg: '#ffffff',
    fontColor: '#111111',
    kicker: 'EDITORIAL',
    titleSample: 'BOLD TYPE',
    subtitleSample: 'Typography-First Layout',
    colors: ['#111111', '#007aff', '#ff3b30', '#ff9500', '#34c759', '#8e8e93'],
    themeData: {
      backgroundColor: '#ffffff',
      fontColor: '#111111',
      fontName: 'Impact, "SF Pro Display", "Arial Black", sans-serif',
      themeColors: ['#111111', '#007aff', '#ff3b30', '#ff9500', '#34c759', '#8e8e93'],
      outline: { style: 'solid', width: 2, color: '#111111' },
      shadow: { h: 4, v: 4, blur: 0, color: '#111111' }
    }
  },
  {
    id: 'exhibition',
    name: 'Exhibition',
    category: 'basic',
    previewBg: '#f7f6f2',
    fontColor: '#2b2927',
    kicker: 'GALLERY',
    titleSample: 'Exhibition',
    subtitleSample: 'Art & Design Showcase',
    colors: ['#c97a5b', '#4a6b6c', '#8a7d65', '#d4af37', '#333333', '#e8dcc4'],
    themeData: {
      backgroundColor: '#f7f6f2',
      fontColor: '#2b2927',
      fontName: 'Georgia, "Times New Roman", serif',
      themeColors: ['#c97a5b', '#4a6b6c', '#8a7d65', '#d4af37', '#333333', '#e8dcc4'],
      outline: { style: 'solid', width: 1.5, color: '#e0dbce' },
      shadow: { h: 0, v: 4, blur: 14, color: 'rgba(43,41,39,0.08)' }
    }
  },
  {
    id: 'editorial',
    name: 'Editorial',
    category: 'basic',
    previewBg: '#faf8f5',
    fontColor: '#1d1d1f',
    fontFamily: 'Georgia, serif',
    kicker: 'MAGAZINE',
    titleSample: 'Editorial',
    subtitleSample: 'Refined Serif Proportions',
    colors: ['#9b3822', '#2f4858', '#4f772d', '#d4a373', '#1d1d1f', '#6c757d'],
    themeData: {
      backgroundColor: '#faf8f5',
      fontColor: '#1d1d1f',
      fontName: 'Georgia, Cambria, serif',
      themeColors: ['#9b3822', '#2f4858', '#4f772d', '#d4a373', '#1d1d1f', '#6c757d'],
      outline: { style: 'solid', width: 1, color: '#e5e1da' },
      shadow: { h: 0, v: 2, blur: 8, color: 'rgba(0,0,0,0.06)' }
    }
  },
  {
    id: 'slate',
    name: 'Slate',
    category: 'basic',
    previewBg: '#1e2430',
    fontColor: '#f1f5f9',
    kicker: 'DEVELOPER',
    titleSample: 'Slate',
    subtitleSample: 'Modern Industrial Tech',
    colors: ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#94a3b8'],
    themeData: {
      backgroundColor: '#1e2430',
      fontColor: '#f1f5f9',
      fontName: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      themeColors: ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#94a3b8'],
      outline: { style: 'solid', width: 2, color: '#334155' },
      shadow: { h: 0, v: 8, blur: 24, color: 'rgba(0,0,0,0.45)' }
    }
  },

  // Premium / Business
  {
    id: 'pitch-deck',
    name: 'Pitch Deck',
    category: 'business',
    previewBg: '#ffffff',
    fontColor: '#0f172a',
    kicker: 'VENTURE CAPITAL',
    titleSample: 'Series A Pitch',
    subtitleSample: 'Metrics, Team & Market Size',
    colors: ['#2563eb', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#64748b'],
    themeData: {
      backgroundColor: '#ffffff',
      fontColor: '#0f172a',
      fontName: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      themeColors: ['#2563eb', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#64748b'],
      outline: { style: 'solid', width: 2, color: '#e2e8f0' },
      shadow: { h: 0, v: 4, blur: 16, color: 'rgba(15,23,42,0.08)' }
    }
  },
  {
    id: 'strategy-brief',
    name: 'Strategy Brief',
    category: 'business',
    previewBg: '#f8fafc',
    fontColor: '#0f172a',
    kicker: 'EXECUTIVE',
    titleSample: 'Strategy Brief',
    subtitleSample: 'Roadmap & OKR Milestones',
    colors: ['#0284c7', '#0d9488', '#e11d48', '#d97706', '#7c3aed', '#475569'],
    themeData: {
      backgroundColor: '#f8fafc',
      fontColor: '#0f172a',
      fontName: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      themeColors: ['#0284c7', '#0d9488', '#e11d48', '#d97706', '#7c3aed', '#475569'],
      outline: { style: 'solid', width: 2, color: '#cbd5e1' },
      shadow: { h: 0, v: 4, blur: 12, color: 'rgba(0,0,0,0.06)' }
    }
  },
  {
    id: 'studio-creative',
    name: 'Studio Creative',
    category: 'creative',
    previewBg: 'linear-gradient(135deg, #2b1055 0%, #7597de 100%)',
    fontColor: '#ffffff',
    kicker: 'SHOWCASE',
    titleSample: 'Studio Deck',
    subtitleSample: 'Creative Portfolio & Reels',
    colors: ['#a855f7', '#ec4899', '#3b82f6', '#14b8a6', '#f97316', '#ffffff'],
    themeData: {
      backgroundColor: '#2b1055',
      fontColor: '#ffffff',
      fontName: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      themeColors: ['#a855f7', '#ec4899', '#3b82f6', '#14b8a6', '#f97316', '#ffffff'],
      outline: { style: 'solid', width: 2, color: 'rgba(255,255,255,0.2)' },
      shadow: { h: 0, v: 10, blur: 25, color: 'rgba(0,0,0,0.4)' }
    }
  },
]

const displayedSections = computed(() => {
  let list = ALL_THEMES
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    return [{ title: 'Search Results', items: list }]
  }

  if (activeCategory.value === 'recents') {
    return [{ title: 'Recently Used', items: list.slice(0, 3) }]
  }

  if (activeCategory.value === 'basic') {
    return [{ title: 'Basic Themes', items: list.filter(t => t.category === 'basic') }]
  }

  if (activeCategory.value === 'business') {
    return [{ title: 'Business & Finance', items: list.filter(t => t.category === 'business') }]
  }

  if (activeCategory.value === 'creative') {
    return [{ title: 'Creative & Design', items: list.filter(t => t.category === 'creative') }]
  }

  // All Themes: cleanly grouped by category without duplicate recent cards
  return [
    { title: 'Basic', items: list.filter(t => t.category === 'basic') },
    { title: 'Business & Pitch', items: list.filter(t => t.category === 'business') },
    { title: 'Creative', items: list.filter(t => t.category === 'creative') },
  ]
})

const closeModal = () => {
  mainStore.setThemeChooserVisible(false)
}

const openAIStudio = () => {
  closeModal()
  mainStore.setAIPPTDialogState(true)
}

const applyThemeAndClose = () => {
  const chosen = ALL_THEMES.find(t => t.id === selectedThemeId.value)
  if (!chosen) return

  // Set aspect ratio
  slidesStore.setViewportRatio(selectedRatio.value === 'wide' ? 0.5625 : 0.75)
  // Apply theme
  slidesStore.setTheme(chosen.themeData)

  closeModal()
}
</script>

<style lang="scss" scoped>
.theme-chooser-dialog {
  width: 860px;
  height: 600px;
  display: flex;
  flex-direction: column;
  background: var(--bg-app, #f5f5f7);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 2px 10px rgba(0, 0, 0, 0.1);
  color: var(--text-primary, #1d1d1f);
}

/* Window Header */
.dialog-header {
  height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-divider, rgba(0, 0, 0, 0.08));
  background: var(--bg-header, rgba(245, 245, 247, 0.95));

  .dialog-title {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.2px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.ratio-selector {
  display: flex;
  background: var(--bg-control, rgba(0, 0, 0, 0.06));
  padding: 2px;
  border-radius: 8px;

  .ratio-pill {
    padding: 4px 10px;
    font-size: 11.5px;
    font-weight: 500;
    color: var(--text-secondary, #515154);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;

    &.active {
      background: var(--bg-control-active, #ffffff);
      color: var(--accent-color, #007aff);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
  }
}

.close-x-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-tertiary, #86868b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--bg-control, rgba(0, 0, 0, 0.08));
    color: var(--text-primary, #1d1d1f);
  }
}

/* Window Body */
.dialog-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 200px;
  background: var(--bg-inspector, rgba(240, 240, 242, 0.8));
  border-right: 1px solid var(--border-divider, rgba(0, 0, 0, 0.08));
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-wrap {
  .search-box {
    display: flex;
    align-items: center;
    background: var(--bg-control, rgba(0, 0, 0, 0.05));
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
    border-radius: 8px;
    height: 30px;
    padding: 0 8px;
    gap: 6px;

    .search-icon {
      font-size: 13px;
      color: var(--text-tertiary, #86868b);
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 12px;
      color: var(--text-primary, #1d1d1f);
      &::placeholder {
        color: var(--text-tertiary, #86868b);
      }
    }

    .clear-icon {
      font-size: 12px;
      cursor: pointer;
      color: var(--text-tertiary, #86868b);
    }
  }
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .category-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-secondary, #515154);
    cursor: pointer;
    transition: all 0.15s ease;

    .cat-icon {
      width: 15px;
      height: 15px;
    }

    .cat-label {
      flex: 1;
    }

    .cat-badge {
      font-size: 9.5px;
      font-weight: 700;
      background: linear-gradient(135deg, #af52de, #5856d6);
      color: #fff;
      padding: 1px 5px;
      border-radius: 4px;
    }

    &:hover:not(.active) {
      background: var(--bg-control, rgba(0, 0, 0, 0.05));
      color: var(--text-primary, #1d1d1f);
    }

    &.active {
      background: var(--accent-color, #007aff);
      color: #ffffff;
      font-weight: 600;

      .cat-badge {
        background: #ffffff;
        color: var(--accent-color, #007aff);
      }
    }
  }
}

/* Main Content */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.25);
    border-radius: 3px;
  }
}

/* Themes Container & Sections */
.themes-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.theme-section {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .section-title {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-primary, #1d1d1f);
    letter-spacing: -0.1px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border-divider, rgba(0, 0, 0, 0.06));
  }
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;

  .preview-slide {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 12px 14px;
    box-sizing: border-box;
    transition: all 0.18s ease;

    .slide-mockup-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      user-select: none;

      .mockup-kicker {
        font-size: 7.5px;
        font-weight: 700;
        letter-spacing: 0.8px;
        opacity: 0.6;
      }

      .mockup-title {
        font-size: 13px;
        font-weight: 800;
        line-height: 1.1;
      }

      .mockup-subtitle {
        font-size: 8.5px;
        line-height: 1.2;
      }

      .mockup-decor {
        width: 22px;
        height: 2.5px;
        border-radius: 2px;
        margin-top: 4px;
      }
    }

    .selected-badge {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--accent-color, #007aff);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0, 122, 255, 0.4);

      .check-icon {
        font-size: 12px;
      }
    }
  }

  &.standard .preview-slide {
    aspect-ratio: 4 / 3;
  }

  &:hover .preview-slide {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
  }

  &.selected .preview-slide {
    border-color: var(--accent-color, #007aff);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.35), 0 6px 18px rgba(0, 0, 0, 0.12);
  }

  .theme-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px;

    .theme-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary, #1d1d1f);
    }

    .theme-swatches {
      display: flex;
      gap: 3px;

      .swatch {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 0.5px solid rgba(0, 0, 0, 0.15);
      }
    }
  }
}

/* Dialog Footer */
.dialog-footer {
  min-height: 52px;
  height: auto;
  padding: 8px 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid var(--border-divider, rgba(0, 0, 0, 0.08));
  background: var(--bg-header, rgba(245, 245, 247, 0.95));

  .footer-btn {
    min-width: 0;
    max-width: 100%;
    padding: 7px 14px;
    border-radius: var(--radius-sm, 6px);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.15s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.15s ease;

    &.secondary {
      background: var(--bg-control, rgba(0, 0, 0, 0.06));
      color: var(--text-primary, #1d1d1f);
      border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));

      &:hover {
        background: var(--bg-control-active, rgba(0, 0, 0, 0.1));
      }
    }

    &.primary {
      background: var(--accent-color, #007aff);
      color: #ffffff;
      font-weight: 600;

      &:hover:not(:disabled) {
        background: #0062cc;
        box-shadow: 0 2px 8px rgba(0, 122, 255, 0.35);
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    &.ai-generate-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, rgba(175, 82, 222, 0.12), rgba(88, 86, 214, 0.15));
      border: 1px solid rgba(175, 82, 222, 0.3);
      color: #af52de;
      font-weight: 600;

      .sparkle-icon {
        width: 14px;
        height: 14px;
      }

      &:hover {
        background: linear-gradient(135deg, rgba(175, 82, 222, 0.2), rgba(88, 86, 214, 0.25));
        box-shadow: 0 2px 8px rgba(175, 82, 222, 0.25);
      }
    }
  }
}
@media (max-width: 700px) {
  .dialog-body {
    flex-direction: column;
  }
  .sidebar {
    width: 100% !important;
    border-right: none !important;
    border-bottom: 1px solid var(--border-divider, rgba(0, 0, 0, 0.08)) !important;
    padding: 8px !important;
  }
  .categories-list {
    flex-direction: row !important;
    overflow-x: auto !important;
    padding-bottom: 4px;
  }
  .category-item {
    white-space: nowrap;
    flex-shrink: 0;
  }
  .themes-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)) !important;
    gap: 10px !important;
  }
  .dialog-footer {
    justify-content: center;
    .footer-center {
      order: 3;
      width: 100%;
      display: flex;
      justify-content: center;
    }
  }
}
</style>