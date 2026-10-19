<template>
  <div class="compatibility-report-modal" v-if="report">
    <div class="report-header">
      <div>
        <div class="report-title">Compatibility &amp; Fidelity Report</div>
        <div class="report-subtitle">
          Source: <strong>{{ report.fileName }}</strong> ({{ report.sourceFormat.toUpperCase() }}) • {{ report.slideCount }} Slides
          <span v-if="report.iwaFileCount"> • {{ report.iwaFileCount }} IWA Streams ({{ report.messageCount }} Objects)</span>
        </div>
      </div>
      <div class="format-badge">{{ report.sourceFormat.toUpperCase() }}</div>
    </div>

    <div class="measures-grid">
      <div class="measure-card">
        <div class="measure-label">1. Import Structure</div>
        <div class="measure-score-row">
          <span class="score">{{ report.measures.importStructure.score }}%</span>
          <span class="status" :class="report.measures.importStructure.status.toLowerCase()">{{ report.measures.importStructure.status }}</span>
        </div>
        <div class="measure-desc">{{ report.measures.importStructure.summary }}</div>
      </div>

      <div class="measure-card">
        <div class="measure-label">2. Visual Fidelity</div>
        <div class="measure-score-row">
          <span class="score">{{ report.measures.visualFidelity.score }}%</span>
          <span class="status" :class="report.measures.visualFidelity.status.toLowerCase()">{{ report.measures.visualFidelity.status }}</span>
        </div>
        <div class="measure-desc">{{ report.measures.visualFidelity.summary }}</div>
      </div>

      <div class="measure-card">
        <div class="measure-label">3. Editability</div>
        <div class="measure-score-row">
          <span class="score">{{ report.measures.editability.score }}%</span>
          <span class="status" :class="report.measures.editability.status.toLowerCase()">{{ report.measures.editability.status }}</span>
        </div>
        <div class="measure-desc">{{ report.measures.editability.summary }}</div>
      </div>

      <div class="measure-card">
        <div class="measure-label">4. Export &amp; Round-Trip</div>
        <div class="measure-score-row">
          <span class="score">{{ report.measures.exportRoundTrip.score }}%</span>
          <span class="status" :class="report.measures.exportRoundTrip.status.toLowerCase()">{{ report.measures.exportRoundTrip.status }}</span>
        </div>
        <div class="measure-desc">{{ report.measures.exportRoundTrip.summary }}</div>
      </div>
    </div>

    <div class="findings-section">
      <div class="findings-title">Detailed Feature Audit ({{ report.findings.length }})</div>
      <div class="findings-list">
        <div
          class="finding-row"
          v-for="(item, idx) in report.findings"
          :key="idx"
          @click="item.slideIndex ? jumpToSlide(item.slideIndex - 1) : undefined"
        >
          <span class="severity-pill" :class="item.severity">{{ item.severity }}</span>
          <span class="slide-pill" v-if="item.slideIndex">Slide {{ item.slideIndex }}</span>
          <strong class="feature-name">{{ item.feature }}:</strong>
          <span class="finding-msg">{{ item.message }}</span>
        </div>
      </div>
    </div>

    <div class="footer-btns">
      <Button @click="exportReportJson()"><i-icon-park-outline:download /> Export JSON Report</Button>
      <Button type="primary" @click="emit('close')">Done</Button>
    </div>
  </div>
  <div class="empty-report" v-else>
    <p>No external presentation has been imported in this session yet. Import an Apple Keynote (<code>.key</code>) or PowerPoint (<code>.pptx</code>) file from the menu to inspect its 4-measure Compatibility Report.</p>
    <div class="footer-btns">
      <Button type="primary" @click="emit('close')">Close</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { saveAs } from 'file-saver'
import { useSlidesStore } from '@/store'
import Button from '@/components/Button.vue'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const slidesStore = useSlidesStore()
const { compatibilityReport: report } = storeToRefs(slidesStore)

const jumpToSlide = (index: number) => {
  if (index >= 0 && index < slidesStore.slides.length) {
    slidesStore.updateSlideIndex(index)
    emit('close')
  }
}

const exportReportJson = () => {
  if (!report.value) return
  const blob = new Blob([JSON.stringify(report.value, null, 2)], { type: 'application/json' })
  saveAs(blob, `${report.value.fileName}-compatibility-report.json`)
}
</script>

<style lang="scss" scoped>
.compatibility-report-modal {
  font-size: 13px;
  color: var(--text-primary, #1d1d1f);
}
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;

  .report-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary, #1d1d1f);
  }
  .report-subtitle {
    font-size: 12px;
    color: var(--text-secondary, #86868b);
    margin-top: 4px;
  }
  .format-badge {
    background: rgba(79, 70, 229, 0.12);
    color: var(--accent-color, #4f46e5);
    font-weight: 700;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 12px;
  }
}
.measures-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.measure-card {
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--bg-control, rgba(128, 128, 128, 0.08));

  .measure-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary, #86868b);
  }
  .measure-score-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 4px 0;

    .score {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary, #1d1d1f);
    }
    .status {
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;

      &.high {
        background: rgba(34, 197, 94, 0.16);
        color: #22c55e;
      }
      &.partial {
        background: rgba(245, 158, 11, 0.16);
        color: #f59e0b;
      }
      &.degraded {
        background: rgba(239, 68, 68, 0.16);
        color: #ef4444;
      }
    }
  }
  .measure-desc {
    font-size: 11px;
    color: var(--text-secondary, #86868b);
    line-height: 1.4;
  }
}
.findings-section {
  .findings-title {
    font-weight: 700;
    font-size: 13px;
    color: var(--text-primary, #1d1d1f);
    margin-bottom: 8px;
  }
  .findings-list {
    max-height: 210px;
    overflow-y: auto;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
    border-radius: 8px;
    padding: 6px;
    background: var(--bg-control, rgba(128, 128, 128, 0.04));
  }
  .finding-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
    font-size: 12px;
    cursor: pointer;

    &:last-child {
      border-bottom: none;
    }
    &:hover {
      background: var(--bg-hover, rgba(128, 128, 128, 0.1));
    }
  }
  .severity-pill {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;

    &.preserved {
      background: rgba(34, 197, 94, 0.16);
      color: #22c55e;
    }
    &.approximated {
      background: rgba(99, 102, 241, 0.16);
      color: #818cf8;
    }
    &.fallback {
      background: rgba(245, 158, 11, 0.16);
      color: #f59e0b;
    }
    &.unsupported {
      background: rgba(239, 68, 68, 0.16);
      color: #ef4444;
    }
  }
  .slide-pill {
    background: var(--bg-control, rgba(128, 128, 128, 0.12));
    color: var(--text-primary, #1d1d1f);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }
  .feature-name {
    color: var(--text-primary, #1d1d1f);
  }
  .finding-msg {
    color: var(--text-secondary, #86868b);
    flex: 1;
  }
}
.footer-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.empty-report {
  font-size: 13px;
  color: var(--text-secondary, #86868b);
  line-height: 1.6;
}
</style>
