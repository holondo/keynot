<template>
  <div class="aippt-dialog">
    <DialogHeader class="header" title="AI Deck Generator" @close="mainStore.setAIPPTDialogState(false)">
      <template #subtitle>
        <template v-if="step === 'template'">Choose a theme below to generate your presentation, or <span class="local" v-tooltip="'Upload a local template file'" @click="uploadLocalTemplate()">use a local template</span></template>
        <template v-else-if="step === 'outline'">Review the outline below (click to edit, right-click to add/delete items), then choose a template</template>
        <template v-else>Enter your presentation topic below, along with context such as industry, role, or purpose</template>
      </template>
    </DialogHeader>
    
    <template v-if="step === 'setup'">
      <Input class="input" 
        ref="inputRef"
        v-model:value="keyword" 
        :maxlength="50" 
        placeholder="Enter presentation topic, e.g., Product Launch Keynote" 
        @enter="createOutline()"
      >
        <template #suffix>
          <span class="count">{{ keyword.length }} / 50</span>
          <div class="submit" type="primary" @click="createOutline()"><i-icon-park-outline:send class="icon" /> Generate</div>
        </template>
      </Input>
      <div class="recommends">
        <div class="recommend" v-for="(item, index) in recommends" :key="index" @click="setKeyword(item)">{{ item }}</div>
      </div>
      <div class="configs">
        <div class="config-item">
          <div class="label">Language:</div>
          <Select 
            class="config-content"
            style="width: 100px;"
            v-model:value="language"
            :options="[
              { label: 'English', value: 'English' },
              { label: 'Português', value: 'Portuguese' },
              { label: 'Español', value: 'Spanish' },
            ]"
          />
        </div>
        <div class="config-item">
          <div class="label">Style:</div>
          <Select 
            class="config-content"
            style="width: 100px;"
            v-model:value="style"
            :options="[
              { label: 'General', value: 'General' },
              { label: 'Academic', value: 'Academic' },
              { label: 'Business', value: 'Business' },
              { label: 'Education', value: 'Education' },
              { label: 'Marketing', value: 'Marketing' },
            ]"
          />
        </div>
        <div class="config-item">
          <div class="label">Model:</div>
          <Select 
            class="config-content"
            style="width: 190px;"
            v-model:value="model"
            :options="[
              { label: 'Qwen3.7-Flash', value: 'qwen:qwen3.7-flash' },
              { label: 'Qwen3.8-Flash', value: 'qwen:qwen3.8-flash' },
              { label: 'Doubao-Seed-2.0-mini', value: 'doubao:doubao-seed-2.0-mini' },
              { label: 'DeepSeek-v4.1-Flash', value: 'qwen:deepseek-v4.1-flash' },
            ]"
          />
        </div>
        <div class="config-item">
          <div class="label">Images:</div>
          <Select 
            class="config-content"
            style="width: 100px;"
            v-model:value="img"
            :options="[
              { label: 'None', value: '' },
              { label: 'Sample', value: 'test' },
              { label: 'AI Search', value: 'ai-search', disabled: true },
              { label: 'AI Generate', value: 'ai-create', disabled: true },
            ]"
          />
        </div>
      </div>
      <div class="configs" v-if="!isEmptySlide">
        <div class="config-item">
          <Checkbox v-model:value="overwrite">Replace existing slides</Checkbox>
        </div>
      </div>
    </template>
    <div class="preview" v-if="step === 'outline'">
      <pre ref="outlineRef" v-if="outlineCreating">{{ outline }}</pre>
       <div class="outline-view" v-else>
         <OutlineEditor v-model:value="outline" />
       </div>
      <div class="btns" v-if="!outlineCreating">
        <Button class="btn" type="primary" @click="step = 'template'">Choose Theme</Button>
        <Button class="btn" @click="outline = ''; step = 'setup'">Start Over</Button>
      </div>
    </div>
    <div class="select-template" v-if="step === 'template'">
      <div class="templates">
        <div class="template" 
          :class="{ 'selected': selectedTemplate === template.id }" 
          v-for="template in templates" 
          :key="template.id" 
          @click="selectedTemplate = template.id"
        >
          <img :src="template.cover" :alt="template.name">
        </div>
      </div>
      <div class="btns">
        <Button class="btn" type="primary" @click="createPPT()">Generate</Button>
        <Button class="btn" @click="step = 'outline'">Back to Outline</Button>
      </div>
    </div>

    <FullscreenSpin 
      :loading="loading" 
      :cancelable="true" 
      tip="Generating with AI, please wait..." 
      @cancel="cancelGeneration" 
    />
  </div>
</template>

<script lang="ts" setup>
import DialogHeader from '@/components/ui/DialogHeader.vue'
import { ref, onMounted, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { jsonrepair } from 'jsonrepair'
import api from '@/services'
import useAIPPT from '@/hooks/useAIPPT'
import useSlideHandler from '@/hooks/useSlideHandler'
import type { AIPPTSlide } from '@/types/AIPPT'
import type { Slide, SlideTheme } from '@/types/slides'
import message from '@/utils/message'
import { decrypt } from '@/utils/crypto'
import { useMainStore, useSlidesStore } from '@/store'
import Input from '@/components/Input.vue'
import Button from '@/components/Button.vue'
import Select from '@/components/Select.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import OutlineEditor from '@/components/OutlineEditor.vue'
import Checkbox from '@/components/Checkbox.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { templates } = storeToRefs(slidesStore)

const { resetSlides, isEmptySlide } = useSlideHandler()
const { AIPPT, presetImgPool, getMdContent } = useAIPPT()

const language = ref('English')
const style = ref('General')
const img = ref('')
const keyword = ref('')
const outline = ref('')
const selectedTemplate = ref('template_1')
const loading = ref(false)
const outlineCreating = ref(false)
const overwrite = ref(true)
const step = ref<'setup' | 'outline' | 'template'>('setup')
const model = ref('qwen:qwen3.7-flash')
const outlineRef = useTemplateRef<HTMLElement>('outlineRef')
const inputRef = useTemplateRef<InstanceType<typeof Input>>('inputRef')

const recommends = ref([
  '2025 Tech Trends & Frontiers',
  'How Big Data Transforms Industries',
  'Market Research & Consumer Insights',
  'Generative AI in Education',
  'Social Media & Brand Strategy',
  'Next-Gen Connectivity Overview',
  'Annual Review & Strategic Roadmap',
  'Distributed Systems Architecture',
  'Career Development & Leadership',
  'Product Launch Keynote',
]) 

onMounted(() => {
  setTimeout(() => {
    inputRef.value!.focus()
  }, 500)
})

const setKeyword = (value: string) => {
  keyword.value = value
  inputRef.value!.focus()
}

let abortController: AbortController | null = null

const cancelGeneration = () => {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  loading.value = false
  outlineCreating.value = false
  message.closeAll()
  mainStore.setAIPPTDialogState(true)
  message.info('AI generation cancelled')
}

const createOutline = async () => {
  if (!keyword.value) return message.error('Please enter a presentation topic first')

  abortController = new AbortController()
  loading.value = true
  outlineCreating.value = true

  const [provider, _model] = model.value.split(':')
  
  try {
    const stream = await api.AIPPT_Outline({
      content: keyword.value,
      language: language.value,
      provider,
      model: _model,
      signal: abortController.signal,
    })
    if (typeof stream === 'object' && stream.state === -1) {
      loading.value = false
      outlineCreating.value = false
      return message.error('Model API rate limit reached, please try another model')
    }

    loading.value = false
    step.value = 'outline'

    const reader: ReadableStreamDefaultReader = stream.body.getReader()
    const decoder = new TextDecoder('utf-8')
    
    const readStream = () => {
      reader.read().then(({ done, value }) => {
        if (done) {
          outline.value = getMdContent(outline.value)
          outline.value = outline.value.replace(/<!--[\s\S]*?-->/g, '')
          outlineCreating.value = false
          return
        }
    
        const chunk = decoder.decode(value, { stream: true })
        outline.value += chunk

        if (outlineRef.value) {
          outlineRef.value.scrollTop = outlineRef.value.scrollHeight + 20
        }

        readStream()
      }).catch(err => {
        if (err.name === 'AbortError') return
        console.error(err)
      })
    }
    readStream()
  }
  catch (err: any) {
    loading.value = false
    outlineCreating.value = false
    if (err.name === 'AbortError') return
    message.error('Failed to generate outline, please try again')
  }
}

const createPPT = async (template?: { slides: Slide[], theme: SlideTheme }) => {
  abortController = new AbortController()
  loading.value = true
  mainStore.setAIPPTDialogState('running')
  message.loading('Generating presentation, please wait...', { duration: 0 })

  if (overwrite.value) resetSlides()

  const [provider, _model] = model.value.split(':')

  try {
    const stream = await api.AIPPT({
      content: outline.value,
      language: language.value,
      style: style.value,
      provider,
      model: _model,
      signal: abortController.signal,
    })
    if (typeof stream === 'object' && stream.state === -1) {
      loading.value = false
      message.closeAll()
      mainStore.setAIPPTDialogState(true)
      return message.error('Selected model is unavailable, please try another model')
    }

    if (img.value === 'test') {
      const imgs = await api.getMockData('imgs')
      presetImgPool(imgs)
    }

    let templateData = template
    if (!templateData) templateData = await api.getMockData(selectedTemplate.value)
    const templateSlides: Slide[] = templateData!.slides
    const templateTheme: SlideTheme = templateData!.theme

    const reader: ReadableStreamDefaultReader = stream.body.getReader()
    const decoder = new TextDecoder('utf-8')
    
    const readStream = () => {
      reader.read().then(({ done, value }) => {
        if (done) {
          loading.value = false
          message.closeAll()
          mainStore.setAIPPTDialogState(false)
          slidesStore.setTheme(templateTheme)
          return
        }
    
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split(/\n+/)

        for (const line of lines) {
          if (line) processChunk(line)
        }

        readStream()
      }).catch(err => {
        if (err.name === 'AbortError') return
        console.error(err)
      })
    }

    const processChunk = (chunk: string) => {
      try {
        const text = chunk.replace('```jsonl', '').replace('```json', '').replace('```', '').trim()
        if (text) {
          const slide: AIPPTSlide = JSON.parse(jsonrepair(text))
          AIPPT(templateSlides, [slide])
        }
      }
      catch (err) {
        // eslint-disable-next-line
        console.error(err)
      }
    }
    readStream()
  }
  catch (err: any) {
    loading.value = false
    message.closeAll()
    mainStore.setAIPPTDialogState(true)
    if (err.name === 'AbortError') return
    message.error('Failed to generate presentation, please try again')
  }
}

const uploadLocalTemplate = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pptist'
  input.click()
  input.addEventListener('change', e => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        try {
          const { slides, theme } = JSON.parse(decrypt(reader.result as string))
          createPPT({ slides, theme })
        }
        catch {
          message.error('Invalid template file format, please choose a valid template')
        }
      })
      reader.readAsText(file)
    }
  })
}
</script>

<style lang="scss" scoped>
.aippt-dialog {
  margin: calc(var(--modal-pad, 20px) * -1);
  padding: 30px;
  color: var(--text-primary, #1d1d1f);
}
.header {
  margin-bottom: 12px;

  .title {
    font-weight: 700;
    font-size: 20px;
    margin-right: 8px;
    background: linear-gradient(270deg, #d897fd, #33bcfc);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    vertical-align: text-bottom;
    line-height: 1.1;
  }
  .subtite {
    color: var(--text-secondary, #86868b);
    font-size: var(--text-sm);

    .local {
      color: var(--accent-color, #007aff);
      text-decoration: underline;
      cursor: pointer;
    }
  }
}
.preview {
  pre {
    max-height: 450px;
    padding: 10px;
    margin-bottom: 15px;
    background-color: var(--bg-control, rgba(128, 128, 128, 0.08));
    border: 1px solid var(--border-color, rgba(128, 128, 128, 0.15));
    border-radius: var(--radius-control);
    color: var(--text-primary, #1d1d1f);
    overflow: auto;
  }
  .outline-view {
    max-height: 450px;
    padding: 10px;
    margin-bottom: 15px;
    background-color: var(--bg-control, rgba(128, 128, 128, 0.08));
    border: 1px solid var(--border-color, rgba(128, 128, 128, 0.15));
    border-radius: var(--radius-control);
    color: var(--text-primary, #1d1d1f);
    overflow: auto;
  }
  .btns {
    display: flex;
    justify-content: center;
    align-items: center;

    .btn {
      min-width: 110px;
      max-width: 100%;
      margin: 0 5px;
    }
  }
}
.select-template {
  .templates {
    max-height: 450px;
    overflow: auto;
    display: flex;
    margin-bottom: 10px;
    padding-right: 5px;
    @include flex-grid-layout();
  
    .template {
      border: 2px solid var(--border-color, rgba(0, 0, 0, 0.1));
      border-radius: var(--radius-control);
      @include flex-grid-layout-children(2, 49%);

      &.selected {
        border-color: var(--accent-color, #007aff);
      }
  
      img {
        width: 100%;
        min-height: 175px;
        border-radius: var(--radius-control);
      }
    }
  }
  .btns {
    display: flex;
    justify-content: center;
    align-items: center;

    .btn {
      min-width: 110px;
      max-width: 100%;
      margin: 0 5px;
    }
  }
}
.recommends {
  display: flex;
  flex-wrap: wrap;
  margin-top: 10px;

  .recommend {
    font-size: var(--text-sm);
    background-color: var(--bg-control, rgba(128, 128, 128, 0.1));
    border: 1px solid var(--border-color, rgba(128, 128, 128, 0.12));
    color: var(--text-primary, #1d1d1f);
    border-radius: var(--radius-control);
    padding: 3px 8px;
    margin-right: 6px;
    margin-top: 6px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      color: var(--accent-color, #007aff);
      border-color: var(--accent-color, #007aff);
    }
  }
}
.configs {
  margin-top: 15px;
  display: flex;
  justify-content: space-between;

  .config-item {
    font-size: var(--text-md);
    display: flex;
    align-items: center;
  }
}
.count {
  font-size: var(--text-sm);
  color: #999;
  margin-right: 10px;
}
.submit {
  height: 20px;
  font-size: var(--text-sm);
  background-color: $themeColor;
  color: #fff;
  display: flex;
  align-items: center;
  padding: 0 8px 0 6px;
  border-radius: $borderRadius;
  cursor: pointer;

  &:hover {
    background-color: $themeHoverColor;
  }

  .icon {
    font-size: var(--text-lg);
    margin-right: 3px;
  }
}

@media screen and (width <= 800px) {
  .configs {
    margin-top: 15px;
    display: flex;
    flex-direction: column;

    .config-item {
      margin-top: 8px;

      .label {
        flex-shrink: 0;
      }

      .config-content {
        width: 100% !important;
      }
    }
  }
  .select-template {
    .templates {
      padding-right: 0;
  
      .template {
        img {
          min-height: 60px;
        }
      }
    }
  }
}

@media screen and (width <= 380px) {
  .preview {
    pre {
      max-height: 400px;
    }
    .outline-view {
      max-height: 400px;
    }
  }
  .select-template {
    .templates {
      max-height: 400px;
    }
  }
}
</style>