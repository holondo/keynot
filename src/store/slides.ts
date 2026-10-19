import { defineStore } from 'pinia'
import { omit } from 'lodash'
import { nanoid } from 'nanoid'
import type { Slide, SlideTheme, PPTElement, PPTAnimation, SlideTemplate, CompatibilityReport, SaveStatus, PresentationSoundtrack } from '@/types/slides'
import { STARTER_SLIDES } from '@/configs/starterSlides'

interface RemovePropData {
  id: string
  propName: string | string[]
}

interface UpdateElementData {
  id: string | string[]
  props: Partial<PPTElement>
  slideId?: string
}

interface FormatedAnimation {
  animations: PPTAnimation[]
  autoNext: boolean
}

export interface SlidesState {
  projectId: string
  title: string
  author?: string
  soundtrack?: PresentationSoundtrack | null
  loopPresentation?: boolean
  theme: SlideTheme
  slides: Slide[]
  slideIndex: number
  viewportSize: number
  viewportRatio: number
  templates: SlideTemplate[]
  saveStatus: SaveStatus
  lastSavedAt: number | null
  lastBackedUpAt: number | null
  compatibilityReport: CompatibilityReport | null
  keynoteSourceBase64: string | null
}

export const useSlidesStore = defineStore('slides', {
  state: (): SlidesState => ({
    projectId: nanoid(12),
    title: 'KeyNot Showcase',
    author: '',
    soundtrack: null,
    loopPresentation: false,
    theme: {
      themeColors: ['#0a84ff', '#5e5ce6', '#30d158', '#ff9f0a', '#ff375f', '#bf5af2'],
      fontColor: '#0f172a',
      fontName: 'Inter',
      backgroundColor: '#f8fafc',
      shadow: {
        h: 3,
        v: 3,
        blur: 6,
        color: '#cbd5e1',
      },
      outline: {
        width: 2,
        color: '#475569',
        style: 'solid',
      },
    },
    slides: [...STARTER_SLIDES],
    slideIndex: 0,
    viewportSize: 1000,
    viewportRatio: 0.5625,
    templates: [
      { name: 'Crimson Horizon', id: 'template_1', cover: './imgs/template_1.webp', origin: 'Built-in Template' },
      { name: 'Urban Indigo', id: 'template_2', cover: './imgs/template_2.webp', origin: 'Built-in Template' },
      { name: 'Geometric Precision', id: 'template_3', cover: './imgs/template_3.webp', origin: 'Built-in Template' },
      { name: 'Soft Morandi', id: 'template_4', cover: './imgs/template_4.webp', origin: 'Built-in Template' },
      { name: 'Botanical Minimal', id: 'template_5', cover: './imgs/template_5.webp', origin: 'Community Curated' },
      { name: 'Warm Editorial', id: 'template_6', cover: './imgs/template_6.webp', origin: 'Community Curated' },
      { name: 'Midnight Slate', id: 'template_7', cover: './imgs/template_7.webp', origin: 'Community Curated' },
      { name: 'Nordic Breeze', id: 'template_8', cover: './imgs/template_8.webp', origin: 'Community Curated' },
    ],
    saveStatus: 'saved',
    lastSavedAt: Date.now(),
    lastBackedUpAt: null,
    compatibilityReport: null,
    keynoteSourceBase64: null,
  }),

  getters: {
    currentSlide(state) {
      return state.slides[state.slideIndex]
    },
  
    currentSlideAnimations(state) {
      const currentSlide = state.slides[state.slideIndex]
      if (!currentSlide?.animations) return []

      const els = currentSlide.elements
      const elIds = els.map(el => el.id)
      return currentSlide.animations.filter(animation => elIds.includes(animation.elId))
    },

    formatedAnimations(state) {
      const currentSlide = state.slides[state.slideIndex]
      if (!currentSlide?.animations) return []

      const els = currentSlide.elements
      const elIds = els.map(el => el.id)
      const animations = currentSlide.animations.filter(animation => elIds.includes(animation.elId))

      const formatedAnimations: FormatedAnimation[] = []
      for (const animation of animations) {
        if (animation.trigger === 'click' || !formatedAnimations.length) {
          formatedAnimations.push({ animations: [animation], autoNext: false })
        }
        else if (animation.trigger === 'meantime') {
          const last = formatedAnimations[formatedAnimations.length - 1]
          last.animations = last.animations.filter(item => item.elId !== animation.elId)
          last.animations.push(animation)
          formatedAnimations[formatedAnimations.length - 1] = last
        }
        else if (animation.trigger === 'auto') {
          const last = formatedAnimations[formatedAnimations.length - 1]
          last.autoNext = true
          formatedAnimations[formatedAnimations.length - 1] = last
          formatedAnimations.push({ animations: [animation], autoNext: false })
        }
      }
      return formatedAnimations
    },
  },

  actions: {
    setProjectId(id: string) {
      this.projectId = id
    },

    setTitle(title: string) {
      if (!title) this.title = 'Untitled Presentation'
      else this.title = title
    },

    setSaveStatus(status: SaveStatus) {
      this.saveStatus = status
      if (status === 'saved') this.lastSavedAt = Date.now()
      if (status === 'backed_up') {
        this.lastSavedAt = Date.now()
        this.lastBackedUpAt = Date.now()
      }
    },

    markBackedUp() {
      this.saveStatus = 'backed_up'
      this.lastBackedUpAt = Date.now()
    },

    setCompatibilityReport(report: CompatibilityReport | null) {
      this.compatibilityReport = report
    },

    setKeynoteSourceBase64(data: string | null) {
      this.keynoteSourceBase64 = data
    },

    setTheme(themeProps: Partial<SlideTheme>) {
      this.theme = { ...this.theme, ...themeProps }
    },
  
    setViewportSize(size: number) {
      this.viewportSize = size
    },
  
    setViewportRatio(viewportRatio: number) {
      this.viewportRatio = viewportRatio
    },
  
    setSlides(slides: Slide[], themeProps?: Partial<SlideTheme>) {
      for (const slide of slides) {
        if (!slide.elements) continue
        for (const el of slide.elements) {
          if (!el.continuityId) el.continuityId = el.id
        }
      }
      this.slides = slides
      if (themeProps) this.setTheme(themeProps)
    },
  
    setTemplates(templates: SlideTemplate[]) {
      this.templates = templates
    },
  
    addSlide(slide: Slide | Slide[]) {
      const slides = Array.isArray(slide) ? slide : [slide]
      for (const s of slides) {
        if (s.sectionTag) delete s.sectionTag
        if (s.elements) {
          for (const el of s.elements) {
            if (!el.continuityId) el.continuityId = el.id
          }
        }
      }

      const addIndex = this.slideIndex + 1
      this.slides.splice(addIndex, 0, ...slides)
      this.slideIndex = addIndex
    },
  
    updateSlide(props: Partial<Slide>, slideId?: string) {
      const slideIndex = slideId ? this.slides.findIndex(item => item.id === slideId) : this.slideIndex
      if (slideIndex === -1) return
      this.slides[slideIndex] = { ...this.slides[slideIndex], ...props }
    },
  
    removeSlideProps(data: RemovePropData) {
      const { id, propName } = data

      const slides = this.slides.map(slide => {
        return slide.id === id ? omit(slide, propName) : slide
      }) as Slide[]
      this.slides = slides
    },
  
    deleteSlide(slideId: string | string[]) {
      const slidesId = Array.isArray(slideId) ? slideId : [slideId]
      const slides: Slide[] = JSON.parse(JSON.stringify(this.slides))
  
      const deleteSlidesIndex = []
      for (const deletedId of slidesId) {
        const index = slides.findIndex(item => item.id === deletedId)
        deleteSlidesIndex.push(index)

        const deletedSlideSection = slides[index].sectionTag
        if (deletedSlideSection) {
          const handleSlideNext = slides[index + 1]
          if (handleSlideNext && !handleSlideNext.sectionTag) {
            delete slides[index].sectionTag
            slides[index + 1].sectionTag = deletedSlideSection
          }
        }

        slides.splice(index, 1)
      }
      let newIndex = Math.min(...deleteSlidesIndex)
  
      const maxIndex = slides.length - 1
      if (newIndex > maxIndex) newIndex = maxIndex
  
      this.slideIndex = newIndex
      this.slides = slides
    },
  
    updateSlideIndex(index: number) {
      this.slideIndex = index
    },
  
    addElement(element: PPTElement | PPTElement[]) {
      const elements = Array.isArray(element) ? element : [element]
      for (const el of elements) {
        if (!el.continuityId) el.continuityId = el.id
      }
      const currentSlideEls = this.slides[this.slideIndex].elements
      const newEls = [...currentSlideEls, ...elements]
      this.slides[this.slideIndex].elements = newEls
    },

    deleteElement(elementId: string | string[]) {
      const elementIdList = Array.isArray(elementId) ? elementId : [elementId]
      const currentSlideEls = this.slides[this.slideIndex].elements
      const newEls = currentSlideEls.filter(item => !elementIdList.includes(item.id))
      this.slides[this.slideIndex].elements = newEls
    },
  
    updateElement(data: UpdateElementData) {
      const { id, props, slideId } = data
      const elIdList = typeof id === 'string' ? [id] : id

      const slideIndex = slideId ? this.slides.findIndex(item => item.id === slideId) : this.slideIndex
      if (slideIndex === -1) return
      const slide = this.slides[slideIndex]
      const elements = slide.elements.map(el => {
        return elIdList.includes(el.id) ? { ...el, ...props } : el
      })
      this.slides[slideIndex].elements = (elements as PPTElement[])
    },
  
    removeElementProps(data: RemovePropData) {
      const { id, propName } = data
      const propsNames = typeof propName === 'string' ? [propName] : propName
  
      const slideIndex = this.slideIndex
      const slide = this.slides[slideIndex]
      const elements = slide.elements.map(el => {
        return el.id === id ? omit(el, propsNames) : el
      })
      this.slides[slideIndex].elements = (elements as PPTElement[])
    },

    setAuthor(author: string) {
      this.author = author
    },

    setSoundtrack(soundtrack: PresentationSoundtrack | null) {
      this.soundtrack = soundtrack
    },

    setLoopPresentation(loop: boolean) {
      this.loopPresentation = loop
    },

    setCustomViewport(width: number, height: number) {
      if (width <= 0 || height <= 0) return
      this.viewportSize = width
      this.viewportRatio = height / width
    },
  },
})