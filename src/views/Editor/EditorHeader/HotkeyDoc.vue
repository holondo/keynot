<template>
  <div class="hotkey-doc">
    <template v-for="item in HOTKEY_DOC" :key="item.type">
      <div class="title">{{item.type}}</div>
      <div class="hotkey-item" v-for="hotkey in item.children" :key="hotkey.label">
        <template v-if="hotkey.value">
          <div class="label">{{hotkey.label}}</div>
          <div class="value">{{hotkey.value}}</div>
        </template>
        <div class="row" v-else>{{hotkey.label}}</div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { HOTKEY_DOC } from '@/configs/hotkey' 
</script>

<style lang="scss" scoped>
.hotkey-doc {
  height: 100%;
  overflow: auto;
  font-size: var(--text-sm);
  margin: 0 -15px;
  padding: 0 15px 15px;
}
.title {
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--text-primary, #1d1d1f);
  border-bottom: 1px solid var(--border-color, rgba(128, 128, 128, 0.15));
  padding: 20px 0 6px 0;

  &:first-child {
    padding-top: 0;
  }
}
.hotkey-item {
  border-bottom: 1px solid var(--border-color, rgba(128, 128, 128, 0.1));
  padding: 10px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-primary, #1d1d1f);
}
.label {
  flex: 1;
  color: var(--text-secondary, #515154);
  @include ellipsis-oneline();
}
.value {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-control, rgba(128, 128, 128, 0.1));
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.15));
  color: var(--text-primary, #1d1d1f);
  white-space: nowrap;
}
.row {
  color: var(--text-secondary, #515154);
}
</style>