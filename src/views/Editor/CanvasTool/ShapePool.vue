<template>
  <div class="keynote-shape-picker">
    <!-- Search Bar -->
    <div class="search-header">
      <div class="search-box">
        <i-icon-park-outline:search class="search-icon" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search shapes..." 
          class="search-input"
        />
        <i-icon-park-outline:close-small 
          v-if="searchQuery" 
          class="clear-icon" 
          @click="searchQuery = ''" 
        />
      </div>
    </div>

    <!-- Category Filter Pills -->
    <div class="categories-bar">
      <div 
        class="cat-pill" 
        :class="{ active: selectedCategory === 'all' }"
        @click="selectedCategory = 'all'"
      >
        All
      </div>
      <div 
        class="cat-pill" 
        v-for="cat in SHAPE_LIST" 
        :key="cat.type"
        :class="{ active: selectedCategory === cat.type }"
        @click="selectedCategory = cat.type"
      >
        {{ cat.type }}
      </div>
    </div>

    <!-- Shape Cards Grid (Screenshot 3) -->
    <div class="shapes-scroll-area">
      <div class="shapes-grid">
        <div 
          class="shape-card" 
          v-for="(shape, idx) in filteredShapes" 
          :key="idx"
          @click="selectShape(shape)"
          :title="shape.pptxShapeType || 'Shape'"
        >
          <svg 
            overflow="visible" 
            width="28"
            height="28"
            viewBox="0 0 28 28"
          >
            <g :transform="`scale(${24 / shape.viewBox[0]}, ${24 / shape.viewBox[1]}) translate(2,2)`">
              <path 
                class="card-path"
                vector-effect="non-scaling-stroke" 
                stroke-linecap="round" 
                stroke-linejoin="round"
                :fill="shape.outlined ? 'currentColor' : 'none'"
                :stroke="shape.outlined ? 'none' : 'currentColor'"
                stroke-width="2" 
                :d="shape.path"
              ></path>
            </g>
          </svg>
        </div>
      </div>
    </div>

    <!-- Bottom Actions: Draw with Pen (Apple Keynote standard) -->
    <div class="picker-footer">
      <button class="footer-btn draw-pen-btn" @click="handleDrawPen">
        <i-icon-park-outline:connection class="btn-icon" />
        <span>Draw with Pen</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { SHAPE_LIST, type ShapePoolItem } from '@/configs/shapes'

const emit = defineEmits<{
  (event: 'select', payload: ShapePoolItem): void
  (event: 'drawPen'): void
}>()

const searchQuery = ref('')
const selectedCategory = ref('all')

const allShapes = computed(() => {
  const result: ShapePoolItem[] = []
  for (const cat of SHAPE_LIST) {
    for (const shape of cat.children) {
      result.push(shape)
    }
  }
  return result
})

const filteredShapes = computed(() => {
  let list = allShapes.value
  if (selectedCategory.value !== 'all') {
    const cat = SHAPE_LIST.find(c => c.type === selectedCategory.value)
    list = cat ? cat.children : allShapes.value
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(s => (s.pptxShapeType && s.pptxShapeType.toLowerCase().includes(q)) || (s.title && s.title.toLowerCase().includes(q)))
  }

  return list
})

const selectShape = (shape: ShapePoolItem) => {
  emit('select', shape)
}

const handleDrawPen = () => {
  emit('drawPen')
}
</script>

<style lang="scss" scoped>
.keynote-shape-picker {
  width: min(320px, calc(100vw - 48px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  color: var(--text-primary, #1d1d1f);
}

.search-header {
  padding: 10px 12px 6px;

  .search-box {
    display: flex;
    align-items: center;
    background: var(--bg-control, rgba(0, 0, 0, 0.05));
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
    border-radius: var(--radius-control);
    height: 30px;
    padding: 0 8px;
    transition: all 0.15s ease;

    &:focus-within {
      background: var(--bg-input, #fff);
      border-color: var(--accent-color, #007aff);
      box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
    }

    .search-icon {
      font-size: var(--text-lg);
      color: var(--text-tertiary, #86868b);
      margin-right: 6px;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: var(--text-sm);
      color: var(--text-primary, #1d1d1f);

      &::placeholder {
        color: var(--text-tertiary, #86868b);
      }
    }

    .clear-icon {
      font-size: var(--text-lg);
      color: var(--text-tertiary, #86868b);
      cursor: pointer;
      &:hover {
        color: var(--text-primary, #1d1d1f);
      }
    }
  }
}

.categories-bar {
  display: flex;
  gap: 6px;
  padding: 4px 12px 8px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  .cat-pill {
    padding: 3px 9px;
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-secondary, #515154);
    background: var(--bg-control, rgba(0, 0, 0, 0.04));
    border-radius: var(--radius-menu);
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--bg-control-active, rgba(0, 0, 0, 0.08));
      color: var(--text-primary, #1d1d1f);
    }

    &.active {
      background: var(--accent-color, #007aff);
      color: #fff;
      font-weight: 600;
    }
  }
}

.shapes-scroll-area {
  max-height: 260px;
  overflow-y: auto;
  padding: 4px 12px 10px;

  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.25);
    border-radius: 3px;
  }
}

.shapes-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.shape-card {
  height: 58px;
  background: var(--bg-control, rgba(0, 0, 0, 0.03));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary, #1d1d1f);
  transition: all 0.15s ease;

  &:hover {
    background: var(--accent-color, #007aff);
    border-color: var(--accent-color, #007aff);
    color: #fff !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(0, 122, 255, 0.3);

    .card-path {
      stroke: #fff !important;
    }
    .card-path[fill="currentColor"] {
      fill: #fff !important;
    }
  }
}

.picker-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  background: var(--bg-control, rgba(0, 0, 0, 0.03));
  border-top: 1px solid var(--border-divider, rgba(0, 0, 0, 0.08));

  .footer-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--accent-color, #007aff);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px 10px;
    border-radius: var(--radius-control);
    transition: background 0.15s ease;

    &:hover {
      background: rgba(0, 122, 255, 0.12);
    }

    .btn-icon {
      font-size: var(--text-md);
    }
  }
}
</style>