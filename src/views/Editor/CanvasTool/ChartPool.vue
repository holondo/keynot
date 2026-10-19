<template>
  <div class="keynote-chart-picker">
    <!-- Real Keynote Chart Categories -->
    <div class="category-selector">
      <div 
        v-for="cat in chartCategories" 
        :key="cat.id"
        class="cat-pill" 
        :class="{ active: activeCategory === cat.id }" 
        @click="activeCategory = cat.id"
      >
        <span>{{ cat.label }}</span>
      </div>
    </div>

    <!-- Main Grid Container with Side Pagination Arrow (Image 1) -->
    <div class="grid-wrapper">
      <div class="charts-grid">
        <div 
          class="chart-card" 
          v-for="item in currentChartList" 
          :key="item.id"
          @click="selectChart(item.type)"
          :title="item.label"
        >
          <div class="chart-illustration">
            <!-- 1. Column -->
            <svg v-if="item.id === 'column'" viewBox="0 0 48 36" class="ill-svg">
              <rect x="5" y="16" width="6" height="15" rx="1.5" :fill="pal[0]" />
              <rect x="13" y="9" width="6" height="22" rx="1.5" :fill="pal[1]" />
              <rect x="21" y="19" width="6" height="12" rx="1.5" :fill="pal[2]" />
              <rect x="29" y="5" width="6" height="26" rx="1.5" :fill="pal[3]" />
              <rect x="37" y="12" width="6" height="19" rx="1.5" :fill="pal[4]" />
            </svg>

            <!-- 2. Stacked Column -->
            <svg v-else-if="item.id === 'stacked-column'" viewBox="0 0 48 36" class="ill-svg">
              <rect x="7" y="22" width="8" height="9" rx="1" :fill="pal[0]" />
              <rect x="7" y="12" width="8" height="9" :fill="pal[1]" />
              <rect x="7" y="6" width="8" height="5" rx="1" :fill="pal[2]" />
              <rect x="20" y="18" width="8" height="13" rx="1" :fill="pal[0]" />
              <rect x="20" y="10" width="8" height="7" :fill="pal[1]" />
              <rect x="20" y="4" width="8" height="5" rx="1" :fill="pal[2]" />
              <rect x="33" y="24" width="8" height="7" rx="1" :fill="pal[0]" />
              <rect x="33" y="14" width="8" height="9" :fill="pal[1]" />
              <rect x="33" y="9" width="8" height="4" rx="1" :fill="pal[2]" />
            </svg>

            <!-- 3. 100% Stacked Column -->
            <svg v-else-if="item.id === 'percent-column'" viewBox="0 0 48 36" class="ill-svg">
              <rect x="7" y="20" width="8" height="11" rx="1" :fill="pal[0]" />
              <rect x="7" y="11" width="8" height="8" :fill="pal[1]" />
              <rect x="7" y="5" width="8" height="5" rx="1" :fill="pal[2]" />
              <rect x="20" y="23" width="8" height="8" rx="1" :fill="pal[0]" />
              <rect x="20" y="13" width="8" height="9" :fill="pal[1]" />
              <rect x="20" y="5" width="8" height="7" rx="1" :fill="pal[2]" />
              <rect x="33" y="17" width="8" height="14" rx="1" :fill="pal[0]" />
              <rect x="33" y="10" width="8" height="6" :fill="pal[1]" />
              <rect x="33" y="5" width="8" height="4" rx="1" :fill="pal[2]" />
            </svg>

            <!-- 4. Bar (Horizontal) -->
            <svg v-else-if="item.id === 'bar'" viewBox="0 0 48 36" class="ill-svg">
              <rect x="5" y="6" width="22" height="5" rx="1.5" :fill="pal[0]" />
              <rect x="5" y="13" width="36" height="5" rx="1.5" :fill="pal[1]" />
              <rect x="5" y="20" width="16" height="5" rx="1.5" :fill="pal[2]" />
              <rect x="5" y="27" width="28" height="5" rx="1.5" :fill="pal[3]" />
            </svg>

            <!-- 5. Stacked Bar -->
            <svg v-else-if="item.id === 'stacked-bar'" viewBox="0 0 48 36" class="ill-svg">
              <rect x="5" y="7" width="10" height="6" rx="1" :fill="pal[0]" />
              <rect x="16" y="7" width="12" height="6" :fill="pal[1]" />
              <rect x="29" y="7" width="8" height="6" rx="1" :fill="pal[2]" />
              <rect x="5" y="16" width="14" height="6" rx="1" :fill="pal[0]" />
              <rect x="20" y="16" width="16" height="6" :fill="pal[1]" />
              <rect x="37" y="16" width="6" height="6" rx="1" :fill="pal[2]" />
              <rect x="5" y="25" width="8" height="6" rx="1" :fill="pal[0]" />
              <rect x="14" y="25" width="10" height="6" :fill="pal[1]" />
              <rect x="25" y="25" width="14" height="6" rx="1" :fill="pal[2]" />
            </svg>

            <!-- 6. 100% Stacked Bar -->
            <svg v-else-if="item.id === 'percent-bar'" viewBox="0 0 48 36" class="ill-svg">
              <rect x="5" y="7" width="14" height="6" rx="1" :fill="pal[0]" />
              <rect x="20" y="7" width="12" height="6" :fill="pal[1]" />
              <rect x="33" y="7" width="10" height="6" rx="1" :fill="pal[2]" />
              <rect x="5" y="16" width="10" height="6" rx="1" :fill="pal[0]" />
              <rect x="16" y="16" width="16" height="6" :fill="pal[1]" />
              <rect x="33" y="16" width="10" height="6" rx="1" :fill="pal[2]" />
              <rect x="5" y="25" width="16" height="6" rx="1" :fill="pal[0]" />
              <rect x="22" y="25" width="11" height="6" :fill="pal[1]" />
              <rect x="34" y="25" width="9" height="6" rx="1" :fill="pal[2]" />
            </svg>

            <!-- 7. Line -->
            <svg v-else-if="item.id === 'line'" viewBox="0 0 48 36" class="ill-svg">
              <path d="M 6 26 L 15 15 L 25 21 L 35 9 L 43 13" fill="none" :stroke="pal[0]" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="6" cy="26" r="2.5" :fill="pal[0]" />
              <circle cx="15" cy="15" r="2.5" :fill="pal[0]" />
              <circle cx="25" cy="21" r="2.5" :fill="pal[0]" />
              <circle cx="35" cy="9" r="2.5" :fill="pal[0]" />
              <circle cx="43" cy="13" r="2.5" :fill="pal[0]" />
            </svg>

            <!-- 8. 2-Axis Line / Bar -->
            <svg v-else-if="item.id === 'two-axis'" viewBox="0 0 48 36" class="ill-svg">
              <rect x="7" y="16" width="6" height="15" rx="1" :fill="pal[1]" opacity="0.65" />
              <rect x="18" y="10" width="6" height="21" rx="1" :fill="pal[1]" opacity="0.65" />
              <rect x="29" y="19" width="6" height="12" rx="1" :fill="pal[1]" opacity="0.65" />
              <rect x="40" y="8" width="5" height="23" rx="1" :fill="pal[1]" opacity="0.65" />
              <path d="M 5 22 L 18 12 L 29 17 L 42 6" fill="none" :stroke="pal[0]" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="5" cy="22" r="2" :fill="pal[0]" />
              <circle cx="18" cy="12" r="2" :fill="pal[0]" />
              <circle cx="29" cy="17" r="2" :fill="pal[0]" />
              <circle cx="42" cy="6" r="2" :fill="pal[0]" />
            </svg>

            <!-- 9. Area -->
            <svg v-else-if="item.id === 'area'" viewBox="0 0 48 36" class="ill-svg">
              <path d="M 5 31 L 5 22 L 15 12 L 27 18 L 39 8 L 43 14 L 43 31 Z" :fill="pal[0]" opacity="0.4" />
              <path d="M 5 22 L 15 12 L 27 18 L 39 8 L 43 14" fill="none" :stroke="pal[0]" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>

            <!-- 10. Stacked Area -->
            <svg v-else-if="item.id === 'stacked-area'" viewBox="0 0 48 36" class="ill-svg">
              <path d="M 5 31 L 5 21 L 16 17 L 29 23 L 43 15 L 43 31 Z" :fill="pal[1]" opacity="0.5" />
              <path d="M 5 21 L 16 11 L 29 14 L 43 7 L 43 15 L 29 23 L 16 17 L 5 21 Z" :fill="pal[0]" opacity="0.75" />
            </svg>

            <!-- 11. Pie -->
            <svg v-else-if="item.id === 'pie'" viewBox="0 0 48 36" class="ill-svg">
              <circle cx="24" cy="18" r="13" :fill="pal[0]" />
              <path d="M 24 18 L 24 5 A 13 13 0 0 1 37 18 Z" :fill="pal[1]" />
              <path d="M 24 18 L 37 18 A 13 13 0 0 1 24 31 Z" :fill="pal[2]" />
            </svg>

            <!-- 12. Donut / Ring -->
            <svg v-else-if="item.id === 'ring'" viewBox="0 0 48 36" class="ill-svg">
              <circle cx="24" cy="18" r="13" fill="none" :stroke="pal[0]" stroke-width="5.5" />
              <circle cx="24" cy="18" r="13" fill="none" :stroke="pal[1]" stroke-width="5.5" stroke-dasharray="24 60" stroke-dashoffset="-10" />
              <circle cx="24" cy="18" r="13" fill="none" :stroke="pal[2]" stroke-width="5.5" stroke-dasharray="20 64" stroke-dashoffset="-38" />
            </svg>

            <!-- 13. Scatter -->
            <svg v-else-if="item.id === 'scatter'" viewBox="0 0 48 36" class="ill-svg">
              <line x1="5" y1="31" x2="43" y2="31" stroke="rgba(128,128,128,0.3)" stroke-width="1" />
              <line x1="5" y1="5" x2="5" y2="31" stroke="rgba(128,128,128,0.3)" stroke-width="1" />
              <circle cx="11" cy="24" r="2.8" :fill="pal[0]" />
              <circle cx="18" cy="15" r="2.8" :fill="pal[1]" />
              <circle cx="26" cy="21" r="2.8" :fill="pal[2]" />
              <circle cx="34" cy="9" r="2.8" :fill="pal[3]" />
              <circle cx="40" cy="17" r="2.8" :fill="pal[0]" />
            </svg>

            <!-- 14. Bubble -->
            <svg v-else-if="item.id === 'bubble'" viewBox="0 0 48 36" class="ill-svg">
              <circle cx="14" cy="22" r="5" :fill="pal[0]" opacity="0.65" />
              <circle cx="23" cy="14" r="7" :fill="pal[1]" opacity="0.65" />
              <circle cx="35" cy="20" r="4.5" :fill="pal[2]" opacity="0.65" />
              <circle cx="38" cy="10" r="3" :fill="pal[3]" opacity="0.65" />
            </svg>

            <!-- 15. Radar -->
            <svg v-else-if="item.id === 'radar'" viewBox="0 0 48 36" class="ill-svg">
              <polygon points="24,5 37,13 32,29 16,29 11,13" fill="none" stroke="rgba(128,128,128,0.3)" stroke-width="1" />
              <polygon points="24,8 35,14 31,27 17,27 13,14" :fill="pal[0]" opacity="0.25" :stroke="pal[0]" stroke-width="1.5" />
              <polygon points="24,12 31,17 28,24 20,24 17,17" :fill="pal[1]" opacity="0.35" :stroke="pal[1]" stroke-width="1.5" />
            </svg>
          </div>
          <div class="chart-label">{{ item.label }}</div>
        </div>
      </div>
    </div>

    <!-- Keynote Color Style / Palette Selector -->
    <div class="palette-bar">
      <div class="palette-info">
        <span class="palette-label">Palette</span>
        <span class="palette-name">{{ currentPalette.name }}</span>
      </div>
      <div class="palette-carousel">
        <button class="nav-arrow" @click="prevPalette" title="Previous Palette">
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
            <path fill-rule="evenodd" d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z"/>
          </svg>
        </button>
        <div class="palette-swatches">
          <div 
            v-for="(p, index) in PALETTES" 
            :key="p.id"
            class="swatch-strip"
            :class="{ active: currentPaletteIndex === index }"
            :title="p.name"
            @click="currentPaletteIndex = index"
          >
            <span v-for="c in p.colors.slice(0, 4)" :key="c" :style="{ backgroundColor: c }"></span>
          </div>
        </div>
        <button class="nav-arrow" @click="nextPalette" title="Next Palette">
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
            <path fill-rule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { ChartType } from '@/types/slides'

const emit = defineEmits<{
  (event: 'select', payload: { type: ChartType; themeColors: string[] }): void
}>()

type ChartCategory = 'all' | 'column-bar' | 'line-area' | 'pie-donut' | 'scatter-radar'

const activeCategory = ref<ChartCategory>('all')

const chartCategories: { id: ChartCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'column-bar', label: 'Col & Bar' },
  { id: 'line-area', label: 'Line & Area' },
  { id: 'pie-donut', label: 'Pie & Donut' },
  { id: 'scatter-radar', label: 'Scatter & Radar' },
]

const currentPaletteIndex = ref(0)

// Apple Keynote 6 color themes for charts
const PALETTES = [
  { id: 'vibrant', name: 'Apple Vibrant', colors: ['#34c759', '#007aff', '#ff9500', '#af52de', '#ff3b30', '#5856d6'] },
  { id: 'ocean', name: 'Ocean Blues', colors: ['#007aff', '#32ade6', '#5856d6', '#0040dd', '#64d2ff', '#0a84ff'] },
  { id: 'sunset', name: 'Sunset Warm', colors: ['#ff9500', '#ff3b30', '#ff2d55', '#ffcc00', '#af52de', '#d63031'] },
  { id: 'forest', name: 'Forest Fresh', colors: ['#34c759', '#30d158', '#2ecc71', '#00b894', '#10ac84', '#1abc9c'] },
  { id: 'royal', name: 'Royal Purple', colors: ['#af52de', '#bf5af2', '#9b59b6', '#5856d6', '#e056fd', '#8e44ad'] },
  { id: 'monochrome', name: 'Monochrome', colors: ['#8e8e93', '#636366', '#48484a', '#3a3a3c', '#2c2c2e', '#1c1c1e'] },
]

const currentPalette = computed(() => PALETTES[currentPaletteIndex.value % PALETTES.length])
const pal = computed(() => currentPalette.value.colors)

const prevPalette = () => {
  currentPaletteIndex.value = (currentPaletteIndex.value - 1 + PALETTES.length) % PALETTES.length
}

const nextPalette = () => {
  currentPaletteIndex.value = (currentPaletteIndex.value + 1) % PALETTES.length
}

interface ChartGridItem {
  id: string
  label: string
  type: ChartType
  category: 'column-bar' | 'line-area' | 'pie-donut' | 'scatter-radar'
}

const chartGrid: ChartGridItem[] = [
  // Column & Bar
  { id: 'column', label: 'Column', type: 'column', category: 'column-bar' },
  { id: 'stacked-column', label: 'Stacked Column', type: 'column', category: 'column-bar' },
  { id: 'percent-column', label: '100% Stacked', type: 'column', category: 'column-bar' },
  { id: 'bar', label: 'Bar', type: 'bar', category: 'column-bar' },
  { id: 'stacked-bar', label: 'Stacked Bar', type: 'bar', category: 'column-bar' },
  { id: 'percent-bar', label: '100% Bar', type: 'bar', category: 'column-bar' },
  // Line & Area
  { id: 'line', label: 'Line', type: 'line', category: 'line-area' },
  { id: 'two-axis', label: '2-Axis', type: 'line', category: 'line-area' },
  { id: 'area', label: 'Area', type: 'area', category: 'line-area' },
  { id: 'stacked-area', label: 'Stacked Area', type: 'area', category: 'line-area' },
  // Pie & Donut
  { id: 'pie', label: 'Pie', type: 'pie', category: 'pie-donut' },
  { id: 'ring', label: 'Donut', type: 'ring', category: 'pie-donut' },
  // Scatter & Radar
  { id: 'scatter', label: 'Scatter', type: 'scatter', category: 'scatter-radar' },
  { id: 'bubble', label: 'Bubble', type: 'scatter', category: 'scatter-radar' },
  { id: 'radar', label: 'Radar', type: 'radar', category: 'scatter-radar' },
]

const currentChartList = computed(() => {
  if (activeCategory.value === 'all') return chartGrid
  return chartGrid.filter(item => item.category === activeCategory.value)
})

const selectChart = (type: ChartType) => {
  emit('select', { type, themeColors: [...pal.value] })
}
</script>

<style lang="scss" scoped>
.keynote-chart-picker {
  width: 410px;
  background: var(--popover-bg, rgba(255, 255, 255, 0.96));
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 10px 12px 10px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  color: var(--text-primary, #1d1d1f);
}

.category-selector {
  display: flex;
  background: var(--bg-control, rgba(0, 0, 0, 0.05));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  padding: 2px;
  margin-bottom: 10px;
  gap: 2px;

  .cat-pill {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary, #515154);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
    white-space: nowrap;

    &:hover:not(.active) {
      color: var(--text-primary, #1d1d1f);
      background: var(--bg-hover, rgba(0, 0, 0, 0.04));
    }

    &.active {
      background: var(--accent-color, #007aff);
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }
  }
}

.grid-wrapper {
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: 8px;
}

.charts-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-height: 290px;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.25);
    border-radius: 2px;
  }
}

.chart-card {
  height: 68px;
  background: var(--bg-control, rgba(0, 0, 0, 0.03));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  box-sizing: border-box;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--accent-color, #007aff);
    background: var(--bg-control-active, #ffffff);
    box-shadow: 0 3px 10px rgba(0, 122, 255, 0.2);
    transform: translateY(-1px);

    .chart-label {
      color: var(--accent-color, #007aff);
      font-weight: 600;
    }
  }
}

.chart-illustration {
  width: 44px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;

  .ill-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
}

.chart-label {
  font-size: 10.5px;
  color: var(--text-primary, #1d1d1f);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 95px;
}

.palette-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border-divider, rgba(0, 0, 0, 0.08));

  .palette-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    padding: 0 2px;

    .palette-label {
      color: var(--text-tertiary, #86868b);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      font-size: 9.5px;
    }

    .palette-name {
      color: var(--text-secondary, #515154);
      font-weight: 600;
    }
  }

  .palette-carousel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;

    .palette-swatches {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .swatch-strip {
      flex: 1;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px 3px;
      border-radius: 6px;
      border: 1.5px solid transparent;
      cursor: pointer;
      background: var(--bg-control, rgba(0, 0, 0, 0.04));
      gap: 3px;
      transition: all 0.15s ease;

      span {
        flex: 1;
        height: 10px;
        border-radius: 2px;
      }

      &:hover {
        background: var(--bg-hover, rgba(0, 0, 0, 0.08));
        transform: translateY(-1px);
      }

      &.active {
        border-color: var(--accent-color, #007aff);
        background: var(--bg-control-active, #ffffff);
        box-shadow: 0 2px 6px rgba(0, 122, 255, 0.25);
      }
    }

    .nav-arrow {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--bg-control, rgba(0, 0, 0, 0.05));
      border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
      color: var(--text-secondary, #515154);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;

      &:hover {
        background: var(--accent-color, #007aff);
        color: #fff;
        border-color: var(--accent-color, #007aff);
      }
    }
  }
}
</style>