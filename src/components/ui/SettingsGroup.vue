<template>
  <section class="settings-group">
    <h3 v-if="title" class="settings-group-title">{{ title }}</h3>
    <div class="settings-group-body"><slot /></div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<style scoped lang="scss">
/* Grouped list (iOS Settings / Android preferences): a caption, then one card of rows. */
.settings-group + .settings-group { margin-top: 18px; }
.settings-group-title {
  margin: 0 0 6px 12px;
  font-size: var(--text-xs);
  font-weight: var(--weight-strong);
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.settings-group-body {
  border-radius: var(--radius-menu);
  background: var(--bg-control);
  overflow: hidden;
}
</style>
