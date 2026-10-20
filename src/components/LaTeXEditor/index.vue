<template>
  <div class="latex-editor">
    <DialogHeader title="Equation (LaTeX)" @close="emit('close')" />
    <div class="container">
      <div class="left">
        <div class="input-area">
          <TextArea v-model:value="latex" placeholder="Enter LaTeX equation" ref="textAreaRef" />
        </div>
        <div class="preview">
          <div class="placeholder" v-if="!latex">Equation Preview</div>
          <div class="preview-content" v-else>
            <FormulaContent
              :width="518"
              :height="138"
              :latex="latex"
            />
          </div>
        </div>
      </div>
      <div class="right">
        <Tabs 
          :tabs="tabs" 
          v-model:value="toolbarState" 
          card
        />
        <div class="content">
          <div class="symbol" v-if="toolbarState === 'symbol'">
            <Tabs 
              :tabs="symbolTabs" 
              v-model:value="selectedSymbolKey" 
              spaceBetween 
              :tabsStyle="{ margin: '10px 10px 0' }" 
            />
            <div class="symbol-pool">
              <div class="symbol-item" v-for="item in symbolPool" :key="item.latex" @click="insertSymbol(item.latex)">
                <SymbolContent :latex="item.latex" />
              </div>
            </div>
          </div>
          <div class="formula" v-else>
            <div class="formula-item" v-for="item in formulaList" :key="item.label">
              <div class="formula-title">{{item.label}}</div>
              <div class="formula-item-content" @click="latex = item.latex">
                <FormulaContent
                  :width="236"
                  :height="60"
                  :latex="item.latex"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="footer">
      <Button class="btn" @click="emit('close')">Cancel</Button>
      <Button class="btn" type="primary" @click="update()">Insert</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import DialogHeader from '@/components/ui/DialogHeader.vue'
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { hfmath } from './hfmath'
import { FORMULA_LIST, SYMBOL_LIST } from '@/configs/latex'
import message from '@/utils/message'

import FormulaContent from './FormulaContent.vue'
import SymbolContent from './SymbolContent.vue'
import Button from '../Button.vue'
import TextArea from '../TextArea.vue'
import Tabs from '../Tabs.vue'

interface TabItem {
  key: 'symbol' | 'formula'
  label: string
}

const tabs: TabItem[] = [
  { label: 'Symbols', key: 'symbol' },
  { label: 'Presets', key: 'formula' },
]

interface LatexResult {
  latex: string
  path: string
  w: number
  h: number
}

const props = withDefaults(defineProps<{
  value?: string
}>(), {
  value: '',
})

const emit = defineEmits<{
  (event: 'update', payload: LatexResult): void
  (event: 'close'): void
}>()

const formulaList = FORMULA_LIST

const symbolTabs = SYMBOL_LIST.map(item => ({
  label: item.label,
  key: item.type,
}))

const latex = ref('')
const toolbarState = ref<'symbol' | 'formula'>('symbol')
const textAreaRef = useTemplateRef<InstanceType<typeof TextArea>>('textAreaRef')

const selectedSymbolKey = ref(SYMBOL_LIST[0].type)
const symbolPool = computed(() => {
  const selectedSymbol = SYMBOL_LIST.find(item => item.type === selectedSymbolKey.value)
  return selectedSymbol?.children || []
})

onMounted(() => {
  if (props.value) latex.value = props.value
  setTimeout(() => {
    textAreaRef.value && textAreaRef.value.focus()
  }, 0)
})

const update = () => {
  if (!latex.value) return message.error('Equation cannot be empty')

  const eq = new hfmath(latex.value)
  const pathd = eq.pathd({})
  const box = eq.box({})
  
  emit('update', {
    latex: latex.value,
    path: pathd,
    w: box.w + 32,
    h: box.h + 32,
  })
}

const insertSymbol = (latex: string) => {
  if (!textAreaRef.value) return
  textAreaRef.value.focus()
  document.execCommand('insertText', false, latex)
}
</script>

<style lang="scss" scoped>
.latex-editor {
  height: min(560px, calc(100dvh - 120px));
}
.container {
  height: calc(100% - 50px);
  display: flex;
}
.left {
  width: 540px;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.input-area {
  flex: 1;

  textarea {
    height: 100% !important;
    border-color: $borderColor !important;
    padding: 10px !important;
    font-family: var(--font-mono);

    &:focus {
      box-shadow: none !important;
    }
  }
}
.preview {
  height: 160px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  margin-top: 20px;
  border: 1px solid $borderColor;
  user-select: none;
  border-radius: $borderRadius;
}
.placeholder {
  color: #888;
  font-size: var(--text-md);
}
.preview-content {
  width: 100%;
  height: 100%;
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.right {
  width: 280px;
  height: 100%;
  margin-left: 20px;
  background-color: var(--bg-control);
  color: var(--text-primary, #1d1d1f);
  display: flex;
  flex-direction: column;
  user-select: none;
  border-radius: var(--radius-control);
  overflow: hidden;
}
/* Narrow screens: formula on top, symbol palette below. */
@media (max-width: 899px) {
  .latex-editor { flex-direction: column; height: auto; }
  .left { width: 100%; height: auto; flex-shrink: 1; }
  .right { width: 100%; height: 280px; margin: 16px 0 0; }
}
.content {
  height: calc(100% - 40px);
  font-size: var(--text-md);
}
.formula {
  height: 100%;
  padding: 12px;

  @include overflow-overlay();
}
.formula-item {
  & + .formula-item {
    margin-top: 10px;
  }

  .formula-title {
    margin-bottom: 5px;
  }
  .formula-item-content {
    height: 60px;
    padding: 5px;
    display: flex;
    align-items: center;
    background-color: $lightGray;
    border-radius: $borderRadius;
    cursor: pointer;
  }
}
.symbol {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.symbol-pool {
  display: flex;
  flex-wrap: wrap;
  flex: 1;
  padding: 12px;

  @include overflow-overlay();
}
.symbol-item {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: $borderRadius;

  &:hover {
    background-color: $lightGray;
    cursor: pointer;
  }
}
.footer {
  height: 50px;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;

  .btn {
    margin-left: 10px;
  }
}
</style>